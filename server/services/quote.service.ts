/**
 * Authoritative Quote Service
 * Calculates server-authoritative prices using MySQL records when connected.
 * In development preview: uses original sample fixtures.
 * In production: fails closed (503) if database is unavailable.
 */

import { checkDatabaseConnection, getPrismaClient } from '../db';
import { loadConfig } from '../config';
import { ProductRepository } from '../repositories/product.repository';
import { calculateAuthoritativeQuote } from '../security';
import { FIXTURE_PRODUCTS } from '../../shared/fixtures';
import { PriceQuoteRequest, PriceQuoteResponse } from '../../shared/types';

export type QuoteServiceResult =
  | { success: true; quote: PriceQuoteResponse; dataSource: 'mysql' | 'development_fixture' }
  | { success: false; statusCode: number; error: string; message?: string };

export class QuoteService {
  private customProductRepo: ProductRepository | null = null;

  constructor(customPrisma?: any) {
    if (customPrisma) {
      this.customProductRepo = new ProductRepository(customPrisma);
    }
  }

  async calculateQuote(payload: PriceQuoteRequest): Promise<QuoteServiceResult> {
    if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) {
      return { success: false, statusCode: 400, error: 'Quote request must include at least one item.' };
    }

    const dbState = await checkDatabaseConnection();
    const config = loadConfig();

    if (dbState.connected) {
      const client = getPrismaClient();
      const productRepo = this.customProductRepo || (client ? new ProductRepository(client) : null);

      if (productRepo) {
        try {
          const productIds = payload.items.map((i) => i.productId);
          const dbProducts = await productRepo.findByIds(productIds);

          if (dbProducts.length === 0) {
            return {
              success: false,
              statusCode: 404,
              error: 'None of the requested products were found in active database catalog.',
            };
          }

          const calcResult = calculateAuthoritativeQuote(payload, dbProducts);
          if (!calcResult.success) {
            return {
              success: false,
              statusCode: calcResult.statusCode,
              error: calcResult.error,
            };
          }

          return {
            success: true,
            quote: calcResult.quote,
            dataSource: 'mysql',
          };
        } catch (err: any) {
          // If query failed unexpectedly, fall through
        }
      }
    }

    // Unconnected handling
    if (config.env === 'production') {
      return {
        success: false,
        statusCode: 503,
        error: 'Database Unavailable',
        message:
          'Authoritative price quoting requires database connectivity in production environment. Refusing to calculate quote from development fixtures.',
      };
    }

    // Development preview fallback
    const fixtureCalc = calculateAuthoritativeQuote(payload, FIXTURE_PRODUCTS);
    if (!fixtureCalc.success) {
      return {
        success: false,
        statusCode: fixtureCalc.statusCode,
        error: fixtureCalc.error,
      };
    }

    return {
      success: true,
      quote: fixtureCalc.quote,
      dataSource: 'development_fixture',
    };
  }
}

export const quoteService = new QuoteService();
