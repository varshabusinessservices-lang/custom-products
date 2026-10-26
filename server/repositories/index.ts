/**
 * Repository Layer Index
 * Provides typed repository instances backed by the singleton Prisma client.
 */

import { getPrismaClient } from '../db';
import { CategoryRepository } from './category.repository';
import { ProductRepository } from './product.repository';
import { CustomisationTemplateRepository } from './template.repository';
import { CartRepository } from './cart.repository';
import { OrderRepository } from './order.repository';

export {
  CategoryRepository,
  ProductRepository,
  CustomisationTemplateRepository,
  CartRepository,
  OrderRepository,
};

export interface RepositoryBundle {
  categories: CategoryRepository;
  products: ProductRepository;
  templates: CustomisationTemplateRepository;
  carts: CartRepository;
  orders: OrderRepository;
}

/**
 * Returns repository bundle if database is actively connected, or null if offline.
 */
export function getRepositories(): RepositoryBundle | null {
  const client = getPrismaClient();
  if (!client) return null;

  return {
    categories: new CategoryRepository(client),
    products: new ProductRepository(client),
    templates: new CustomisationTemplateRepository(client),
    carts: new CartRepository(client),
    orders: new OrderRepository(client),
  };
}
