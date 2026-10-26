/**
 * Order Repository
 * Manages order read models and atomic order snapshot creation using Prisma transactions.
 */

import { PrismaClient, OrderStatus, PaymentStatus } from '@prisma/client';

export interface CreateOrderSnapshotParams {
  orderNumber: string;
  customerId?: string;
  guestEmail?: string;
  guestPhone?: string;
  addressSnapshot: Record<string, any>;
  subtotalPaisa: number;
  discountPaisa: number;
  deliveryFeePaisa: number;
  taxPaisa: number;
  totalAmountPaisa: number;
  currency?: string;
  notes?: string;
  items: {
    productId: string;
    variantId?: string;
    productTitleSnapshot: string;
    skuSnapshot: string;
    quantity: number;
    unitBasePaisa: number;
    unitCustomisationPaisa: number;
    totalLinePaisa: number;
    customisationValues?: {
      slotId: string;
      textValue?: string;
      imageStorageKey?: string;
      originalFileName?: string;
      fileSizeBytes?: number;
    }[];
  }[];
}

export class OrderRepository {
  constructor(private prisma: PrismaClient) {}

  async findByOrderNumber(orderNumber: string, customerId?: string) {
    const where: any = { orderNumber };
    if (customerId) {
      where.customerId = customerId;
    }

    return this.prisma.order.findUnique({
      where,
      include: {
        items: {
          include: {
            customisationValues: true,
          },
        },
        payments: true,
        shipments: true,
      },
    });
  }

  async findByCustomerId(customerId: string, limit = 20) {
    return this.prisma.order.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
      take: Math.min(50, limit),
      include: {
        items: {
          select: {
            id: true,
            productTitleSnapshot: true,
            skuSnapshot: true,
            quantity: true,
            totalLinePaisa: true,
          },
        },
      },
    });
  }

  /**
   * Atomic Order Creation inside a database transaction.
   * Guarantees all items and customisation snapshots are written together or rolled back.
   */
  async createOrderSnapshot(params: CreateOrderSnapshotParams) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: {
          orderNumber: params.orderNumber,
          customerId: params.customerId || null,
          guestEmail: params.guestEmail || null,
          guestPhone: params.guestPhone || null,
          addressSnapshotJson: JSON.stringify(params.addressSnapshot),
          subtotalPaisa: params.subtotalPaisa,
          discountPaisa: params.discountPaisa,
          deliveryFeePaisa: params.deliveryFeePaisa,
          taxPaisa: params.taxPaisa,
          totalAmountPaisa: params.totalAmountPaisa,
          currency: params.currency || 'INR',
          status: OrderStatus.PENDING_PAYMENT,
          paymentStatus: PaymentStatus.INITIATED,
          notes: params.notes || null,
        },
      });

      for (const item of params.items) {
        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            variantId: item.variantId || null,
            productTitleSnapshot: item.productTitleSnapshot,
            skuSnapshot: item.skuSnapshot,
            quantity: item.quantity,
            unitBasePaisa: item.unitBasePaisa,
            unitCustomisationPaisa: item.unitCustomisationPaisa,
            totalLinePaisa: item.totalLinePaisa,
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

      return tx.order.findUnique({
        where: { id: order.id },
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
