/**
 * Category Repository
 * Manages database access for categories using parameterized Prisma queries.
 */

import { PrismaClient } from '@prisma/client';
import { Category } from '../../shared/types';

export class CategoryRepository {
  constructor(private prisma: PrismaClient) {}

  async findAll(onlyActive = true): Promise<Category[]> {
    const records = await this.prisma.category.findMany({
      where: onlyActive ? { isActive: true } : undefined,
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: {
          select: { products: { where: { isActive: true } } },
        },
      },
    });

    return records.map((r) => this.mapToDomain(r));
  }

  async findBySlug(slug: string): Promise<Category | null> {
    const record = await this.prisma.category.findUnique({
      where: { slug },
      include: {
        _count: {
          select: { products: { where: { isActive: true } } },
        },
      },
    });

    if (!record || !record.isActive) return null;
    return this.mapToDomain(record);
  }

  async findById(id: string): Promise<Category | null> {
    const record = await this.prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: { where: { isActive: true } } },
        },
      },
    });

    if (!record) return null;
    return this.mapToDomain(record);
  }

  private mapToDomain(r: any): Category {
    return {
      id: r.id,
      slug: r.slug,
      name: r.name,
      shortDescription: r.shortDescription || '',
      icon: r.iconUrl || 'Gift',
      bannerUrl: r.bannerUrl || undefined,
      itemCount: r._count?.products ?? 0,
      featured: r.displayOrder <= 4,
      displayOrder: r.displayOrder,
    };
  }
}
