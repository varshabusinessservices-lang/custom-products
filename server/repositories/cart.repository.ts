/**
 * Cart Repository
 * Handles cart persistence and atomic item updates using Prisma transactions.
 */

import { PrismaClient } from '@prisma/client';

export interface AddCartItemParams {
  productId: string;
  variantId?: string;
  quantity: number;
  unitBasePaisa: number;
  unitCustomisationPaisa?: number;
  customisationValues?: {
    slotId: string;
    textValue?: string;
    imageStorageKey?: string;
    originalFileName?: string;
    fileSizeBytes?: number;
  }[];
}

export class CartRepository {
  constructor(private prisma: PrismaClient) {}

  async findByGuestToken(guestToken: string) {
    return this.prisma.cart.findUnique({
      where: { guestToken },
      include: {
        items: {
          include: {
            product: { select: { id: true, title: true, slug: true, basePricePaisa: true } },
            variant: { select: { id: true, title: true, additionalPaisa: true } },
            customisationValues: true,
          },
        },
      },
    });
  }

  async findByUserId(userId: string) {
    return this.prisma.cart.findFirst({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        items: {
          include: {
            product: { select: { id: true, title: true, slug: true, basePricePaisa: true } },
            variant: { select: { id: true, title: true, additionalPaisa: true } },
            customisationValues: true,
          },
        },
      },
    });
  }

  /**
   * Atomically create or update cart and its line items inside a database transaction.
   */
  async upsertGuestCart(guestToken: string, items: AddCartItemParams[]) {
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    return this.prisma.$transaction(async (tx) => {
      // 1. Find or create cart
      let cart = await tx.cart.findUnique({ where: { guestToken } });
      if (!cart) {
        cart = await tx.cart.create({
          data: {
            guestToken,
            expiresAt,
          },
        });
      } else {
        // Clear old items for an authoritative sync or update
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
      }

      // 2. Insert new cart items and customisation values
      for (const item of items) {
        await tx.cartItem.create({
          data: {
            cartId: cart.id,
            productId: item.productId,
            variantId: item.variantId || null,
            quantity: item.quantity,
            unitBasePaisa: item.unitBasePaisa,
            unitCustomisationPaisa: item.unitCustomisationPaisa || 0,
            customisationValues: item.customisationValues
              ? {
                  create: item.customisationValues.map((cv) => ({
                    slotId: cv.slotId,
                    textValue: cv.textValue || null,
                    imageStorageKey: cv.imageStorageKey || null,
                    originalFileName: cv.originalFileName || null,
                    fileSizeBytes: cv.fileSizeBytes || null,
                  })),
                }
              : undefined,
          },
        });
      }

      return tx.cart.findUnique({
        where: { id: cart.id },
        include: {
          items: {
            include: {
              customisationValues: true,
            },
          },
        },
      });
    });
  }
}
