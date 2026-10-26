/**
 * Customisation Template Repository
 * Parameterized queries for versioned customisation templates and schema slots.
 */

import { PrismaClient } from '@prisma/client';
import { CustomisationTemplate, CustomisationSlotDefinition } from '../../shared/types';

export class CustomisationTemplateRepository {
  constructor(private prisma: PrismaClient) {}

  async findActiveByProductId(productIdOrSlug: string): Promise<CustomisationTemplate | null> {
    const record = await this.prisma.customisationTemplate.findFirst({
      where: {
        product: {
          OR: [{ id: productIdOrSlug }, { slug: productIdOrSlug }],
          isActive: true,
        },
        isActive: true,
      },
      include: {
        slots: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!record) return null;
    return this.mapToDomain(record);
  }

  async findByVersion(productId: string, schemaVersion: number): Promise<CustomisationTemplate | null> {
    const record = await this.prisma.customisationTemplate.findFirst({
      where: {
        productId,
        schemaVersion,
      },
      include: {
        slots: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!record) return null;
    return this.mapToDomain(record);
  }

  private mapToDomain(record: any): CustomisationTemplate {
    return {
      id: record.id,
      productId: record.productId,
      templateKey: record.templateKey,
      name: record.name,
      description: record.description || '',
      previewBaseImageUrl: record.previewBaseImageUrl,
      schemaVersion: record.schemaVersion,
      slots: (record.slots || []).map((s: any): CustomisationSlotDefinition => {
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
}
