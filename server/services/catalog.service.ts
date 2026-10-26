/**
 * Catalog Service
 * Wires public catalog endpoints to MySQL repositories when connected.
 * In development preview without MySQL: cleanly falls back to original sample fixtures.
 * In production without MySQL: strictly FAILS CLOSED (503 Service Unavailable), never silently serving fake data.
 */

import { checkDatabaseConnection, getPrismaClient } from '../db';
import { loadConfig } from '../config';
import { CategoryRepository } from '../repositories/category.repository';
import { ProductRepository, ProductQueryFilters } from '../repositories/product.repository';
import { CustomisationTemplateRepository } from '../repositories/template.repository';
import { FIXTURE_CATEGORIES, FIXTURE_PRODUCTS } from '../../shared/fixtures';
import { Category, Product, CustomisationTemplate } from '../../shared/types';

export type ServiceResult<T> =
  | { success: true; data: T; dataSource: 'mysql' | 'development_fixture'; isDevelopmentPreview?: boolean }
  | { success: false; statusCode: number; error: string; message: string; dataSource: 'none' };

export class CatalogService {
  private categoryRepo: CategoryRepository | null = null;
  private productRepo: ProductRepository | null = null;
  private templateRepo: CustomisationTemplateRepository | null = null;

  constructor(customPrisma?: any) {
    if (customPrisma) {
      this.categoryRepo = new CategoryRepository(customPrisma);
      this.productRepo = new ProductRepository(customPrisma);
      this.templateRepo = new CustomisationTemplateRepository(customPrisma);
    }
  }

  private async getRepos() {
    if (this.categoryRepo && this.productRepo && this.templateRepo) {
      return {
        categoryRepo: this.categoryRepo,
        productRepo: this.productRepo,
        templateRepo: this.templateRepo,
      };
    }

    const client = getPrismaClient();
    if (!client) return null;

    return {
      categoryRepo: new CategoryRepository(client),
      productRepo: new ProductRepository(client),
      templateRepo: new CustomisationTemplateRepository(client),
    };
  }

  async getCategories(): Promise<ServiceResult<{ count: number; categories: Category[] }>> {
    const dbState = await checkDatabaseConnection();
    const config = loadConfig();

    if (dbState.connected) {
      const repos = await this.getRepos();
      if (repos) {
        try {
          const categories = await repos.categoryRepo.findAll(true);
          return {
            success: true,
            data: { count: categories.length, categories },
            dataSource: 'mysql',
          };
        } catch (err: any) {
          // If query fails, fall through to error handling
        }
      }
    }

    // Unconnected handling
    if (config.env === 'production') {
      return {
        success: false,
        statusCode: 503,
        error: 'Database Unavailable',
        message: 'Database persistence is offline in production environment. Refusing to serve development fixtures.',
        dataSource: 'none',
      };
    }

    // Development preview fallback
    return {
      success: true,
      data: { count: FIXTURE_CATEGORIES.length, categories: FIXTURE_CATEGORIES },
      dataSource: 'development_fixture',
      isDevelopmentPreview: true,
    };
  }

  async getProducts(
    filters: ProductQueryFilters = {}
  ): Promise<ServiceResult<{ products: Product[]; total: number; page?: number; limit?: number; totalPages?: number }>> {
    const dbState = await checkDatabaseConnection();
    const config = loadConfig();

    if (dbState.connected) {
      const repos = await this.getRepos();
      if (repos) {
        try {
          const paginated = await repos.productRepo.findPublished(filters);
          return {
            success: true,
            data: paginated,
            dataSource: 'mysql',
          };
        } catch (err: any) {
          // Fall through
        }
      }
    }

    // Unconnected handling
    if (config.env === 'production') {
      return {
        success: false,
        statusCode: 503,
        error: 'Database Unavailable',
        message: 'Database persistence is offline in production environment. Refusing to serve development fixtures.',
        dataSource: 'none',
      };
    }

    // Development preview fallback: apply filters to FIXTURE_PRODUCTS
    let results = [...FIXTURE_PRODUCTS];

    if (filters.categorySlug) {
      results = results.filter((p) => p.categorySlug === filters.categorySlug);
    }

    if (filters.search) {
      const term = filters.search.toLowerCase().trim();
      results = results.filter(
        (p) =>
          p.title.toLowerCase().includes(term) ||
          p.shortSummary.toLowerCase().includes(term) ||
          p.tags.some((t) => t.toLowerCase().includes(term))
      );
    }

    if (filters.minPricePaisa !== undefined && !isNaN(filters.minPricePaisa)) {
      results = results.filter((p) => p.basePricePaisa >= filters.minPricePaisa!);
    }

    if (filters.maxPricePaisa !== undefined && !isNaN(filters.maxPricePaisa)) {
      results = results.filter((p) => p.basePricePaisa <= filters.maxPricePaisa!);
    }

    if (filters.sort === 'price_asc') {
      results.sort((a, b) => a.basePricePaisa - b.basePricePaisa);
    } else if (filters.sort === 'price_desc') {
      results.sort((a, b) => b.basePricePaisa - a.basePricePaisa);
    } else if (filters.sort === 'rating') {
      results.sort((a, b) => b.ratingAverage - a.ratingAverage);
    }

    return {
      success: true,
      data: {
        products: results,
        total: results.length,
        page: 1,
        limit: results.length,
        totalPages: 1,
      },
      dataSource: 'development_fixture',
      isDevelopmentPreview: true,
    };
  }

  async getProductBySlug(slug: string): Promise<ServiceResult<{ product: Product }>> {
    const dbState = await checkDatabaseConnection();
    const config = loadConfig();

    if (dbState.connected) {
      const repos = await this.getRepos();
      if (repos) {
        try {
          const product = await repos.productRepo.findBySlug(slug);
          if (!product) {
            return {
              success: false,
              statusCode: 404,
              error: 'Product Not Found',
              message: `Product with identifier '${slug}' does not exist.`,
              dataSource: 'none',
            };
          }
          return {
            success: true,
            data: { product },
            dataSource: 'mysql',
          };
        } catch {
          // Fall through
        }
      }
    }

    // Unconnected handling
    if (config.env === 'production') {
      return {
        success: false,
        statusCode: 503,
        error: 'Database Unavailable',
        message: 'Database persistence is offline in production environment. Refusing to serve development fixtures.',
        dataSource: 'none',
      };
    }

    const product = FIXTURE_PRODUCTS.find((p) => p.slug === slug || p.id === slug);
    if (!product) {
      return {
        success: false,
        statusCode: 404,
        error: 'Product Not Found',
        message: `Product with identifier '${slug}' does not exist in development fixtures.`,
        dataSource: 'none',
      };
    }

    return {
      success: true,
      data: { product },
      dataSource: 'development_fixture',
      isDevelopmentPreview: true,
    };
  }

  async getTemplateByProductId(productId: string): Promise<ServiceResult<{ template: CustomisationTemplate }>> {
    const dbState = await checkDatabaseConnection();
    const config = loadConfig();

    if (dbState.connected) {
      const repos = await this.getRepos();
      if (repos) {
        try {
          const template = await repos.templateRepo.findActiveByProductId(productId);
          if (!template) {
            return {
              success: false,
              statusCode: 404,
              error: 'Template Not Found',
              message: `Customisation template for product '${productId}' was not found.`,
              dataSource: 'none',
            };
          }
          return {
            success: true,
            data: { template },
            dataSource: 'mysql',
          };
        } catch {
          // Fall through
        }
      }
    }

    // Unconnected handling
    if (config.env === 'production') {
      return {
        success: false,
        statusCode: 503,
        error: 'Database Unavailable',
        message: 'Database persistence is offline in production environment. Refusing to serve development fixtures.',
        dataSource: 'none',
      };
    }

    const product = FIXTURE_PRODUCTS.find((p) => p.id === productId || p.slug === productId);
    if (!product || !product.customisationTemplate) {
      return {
        success: false,
        statusCode: 404,
        error: 'Template Not Found',
        message: 'Customisation template not found for this product in fixtures.',
        dataSource: 'none',
      };
    }

    return {
      success: true,
      data: { template: product.customisationTemplate },
      dataSource: 'development_fixture',
      isDevelopmentPreview: true,
    };
  }
}

export const catalogService = new CatalogService();
