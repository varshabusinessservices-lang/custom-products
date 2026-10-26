/**
 * Product Repository
 * Parameterized Prisma queries for catalog products, variants, and customisation templates.
 * Prevents N+1 queries by eager-loading relations in a single database round-trip.
 * Never fetches private image paths or customer uploads in public catalog queries.
 */

import { PrismaClient, Prisma } from '@prisma/client';
import { Product, ProductVariant, CustomisationTemplate, CustomisationSlotDefinition } from '../../shared/types';

export interface ProductQueryFilters {
  categorySlug?: string;
  search?: string;
  minPricePaisa?: number;
  maxPricePaisa?: number;
  sort?: 'popular' | 'price_asc' | 'price_desc' | 'rating';
  page?: number;
  limit?: number;
}

export interface PaginatedProducts {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export class ProductRepository {
  constructor(private prisma: PrismaClient) {}

  async findPublished(filters: ProductQueryFilters = {}): Promise<PaginatedProducts> {
    const page = Math.max(1, Math.floor(Number(filters.page) || 1));
    const limit = Math.min(100, Math.max(1, Math.floor(Number(filters.limit) || 20)));
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      isActive: true,
    };

    if (filters.categorySlug) {
      where.category = {
        slug: filters.categorySlug,
        isActive: true,
      };
    }

    if (filters.search) {
      const term = filters.search.trim();
      where.OR = [
        { title: { contains: term } },
        { shortSummary: { contains: term } },
        { description: { contains: term } },
      ];
    }

    if (filters.minPricePaisa !== undefined && !isNaN(filters.minPricePaisa)) {
      where.basePricePaisa = { ...(where.basePricePaisa as any), gte: filters.minPricePaisa };
    }

    if (filters.maxPricePaisa !== undefined && !isNaN(filters.maxPricePaisa)) {
      where.basePricePaisa = { ...(where.basePricePaisa as any), lte: filters.maxPricePaisa };
    }

    // Determine sorting
    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    if (filters.sort === 'price_asc') {
      orderBy = { basePricePaisa: 'asc' };
    } else if (filters.sort === 'price_desc') {
      orderBy = { basePricePaisa: 'desc' };
    } else if (filters.sort === 'rating') {
      orderBy = { ratingAverage: 'desc' };
    } else {
      // Default 'popular'
      orderBy = { ratingCount: 'desc' };
    }

    // Run count and query in single Prisma call or transaction to avoid drift
    const [total, records] = await this.prisma.$transaction([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          category: { select: { slug: true } },
          images: {
            orderBy: { displayOrder: 'asc' },
            select: { id: true, imageUrl: true, altText: true, isPrimary: true },
          },
          variants: {
            where: { isActive: true },
            select: {
              id: true,
              productId: true,
              sku: true,
              title: true,
              attributeType: true,
              attributeValue: true,
              additionalPaisa: true,
              stockQuantity: true,
              isActive: true,
            },
          },
          templates: {
            where: { isActive: true },
            take: 1,
            include: {
              slots: {
                orderBy: { sortOrder: 'asc' },
              },
            },
          },
        },
      }),
    ]);

    const products = records.map((r) => this.mapToDomain(r));
    return {
      products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  async findBySlug(slugOrId: string): Promise<Product | null> {
    const record = await this.prisma.product.findFirst({
      where: {
        OR: [{ slug: slugOrId }, { id: slugOrId }],
        isActive: true,
      },
      include: {
        category: { select: { slug: true } },
        images: {
          orderBy: { displayOrder: 'asc' },
          select: { id: true, imageUrl: true, altText: true, isPrimary: true },
        },
        variants: {
          where: { isActive: true },
          select: {
            id: true,
            productId: true,
            sku: true,
            title: true,
            attributeType: true,
            attributeValue: true,
            additionalPaisa: true,
            stockQuantity: true,
            isActive: true,
          },
        },
        templates: {
          where: { isActive: true },
          take: 1,
          include: {
            slots: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!record) return null;
    return this.mapToDomain(record);
  }

  async findByIds(ids: string[]): Promise<Product[]> {
    if (ids.length === 0) return [];

    const records = await this.prisma.product.findMany({
      where: {
        OR: [{ id: { in: ids } }, { slug: { in: ids } }],
        isActive: true,
      },
      include: {
        category: { select: { slug: true } },
        images: {
          orderBy: { displayOrder: 'asc' },
          select: { id: true, imageUrl: true, altText: true, isPrimary: true },
        },
        variants: {
          where: { isActive: true },
          select: {
            id: true,
            productId: true,
            sku: true,
            title: true,
            attributeType: true,
            attributeValue: true,
            additionalPaisa: true,
            stockQuantity: true,
            isActive: true,
          },
        },
        templates: {
          where: { isActive: true },
          take: 1,
          include: {
            slots: {
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  private mapToDomain(r: any): Product {
    const discountPercent =
      r.originalMspPaisa > r.basePricePaisa
        ? Math.round(((r.originalMspPaisa - r.basePricePaisa) / r.originalMspPaisa) * 100)
        : 0;

    let customisationTemplate: CustomisationTemplate | undefined = undefined;
    if (r.templates && r.templates.length > 0) {
      const t = r.templates[0];
      customisationTemplate = {
        id: t.id,
        productId: t.productId,
        templateKey: t.templateKey,
        name: t.name,
        description: t.description || '',
        previewBaseImageUrl: t.previewBaseImageUrl,
        schemaVersion: t.schemaVersion,
        slots: (t.slots || []).map((s: any): CustomisationSlotDefinition => {
          let options: string[] | undefined = undefined;
          if (s.optionsJson) {
            try {
              options = JSON.parse(s.optionsJson);
            } catch {
              options = undefined;
            }
          }
          let allowedMimes: string[] | undefined = undefined;
          if (s.allowedMimesJson) {
            try {
              allowedMimes = JSON.parse(s.allowedMimesJson);
            } catch {
              allowedMimes = undefined;
            }
          }
          return {
            slotKey: s.slotKey,
            slotType: s.slotType,
            label: s.label,
            placeholder: s.placeholder || undefined,
            required: s.required,
            maxLength: s.maxLength || undefined,
            options,
            helpText: s.helpText || undefined,
            allowedMimes,
            maxFileSizeMb: s.maxFileSizeMb || 15,
            aspectRatio: s.aspectRatio || undefined,
          };
        }),
      };
    }

    const variants: ProductVariant[] = (r.variants || []).map((v: any) => ({
      id: v.id,
      productId: v.productId,
      sku: v.sku,
      title: v.title,
      attributeType: v.attributeType,
      attributeValue: v.attributeValue,
      additionalPaisa: v.additionalPaisa,
      stockQuantity: v.stockQuantity,
      isAvailable: v.isActive && v.stockQuantity > 0,
    }));

    return {
      id: r.id,
      sku: r.sku,
      title: r.title,
      slug: r.slug,
      categorySlug: r.category?.slug || '',
      shortSummary: r.shortSummary,
      description: r.description,
      basePricePaisa: r.basePricePaisa,
      originalMspPaisa: r.originalMspPaisa,
      discountPercent,
      isPersonalised: r.isPersonalised,
      leadTimeDays: r.leadTimeDays,
      minDeliveryDays: r.minDeliveryDays,
      maxDeliveryDays: r.maxDeliveryDays,
      ratingAverage: r.ratingAverage,
      ratingCount: r.ratingCount,
      stockStatus: (r.stockStatus as any) || 'IN_STOCK',
      images: (r.images || []).map((img: any) => ({
        id: img.id,
        url: img.imageUrl,
        alt: img.altText,
        isPrimary: img.isPrimary,
      })),
      variants,
      customisationTemplate,
      tags: [],
      features: [],
      specifications: {},
      isDevelopmentFixture: false,
    };
  }
}
