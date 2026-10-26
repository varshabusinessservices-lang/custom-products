/**
 * Fixture-to-Real-Catalog Database Seed Script
 * Migrates synthetic development fixtures into MySQL 8.
 * Uses Prisma transactions and idempotent upserts.
 * Run with: npx tsx scripts/seed-catalog.ts
 */

import { PrismaClient } from '@prisma/client';
import { FIXTURE_CATEGORIES, FIXTURE_PRODUCTS } from '../shared/fixtures';
import { loadConfig } from '../server/config';

async function seed() {
  const config = loadConfig();
  console.log('=====================================================');
  console.log('MySQL 8 Catalog Import Utility');
  console.log('=====================================================');
  console.log(`Database Target: ${config.database.maskedUrl}`);

  if (!config.database.isConfigured) {
    console.error('ERROR: DATABASE_URL is not configured for a live MySQL 8 host.');
    console.log('To import catalog fixtures into MySQL:');
    console.log('  1. Configure DATABASE_URL="mysql://user:password@host:3306/dbname" in .env');
    console.log('  2. Run: npx prisma migrate deploy');
    console.log('  3. Run: npx tsx scripts/seed-catalog.ts');
    process.exit(1);
  }

  const prisma = new PrismaClient({
    datasources: { db: { url: config.database.rawUrl } },
  });

  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('✓ Successfully connected to MySQL instance.');

    console.log('\n--- 1. Importing Categories ---');
    for (const cat of FIXTURE_CATEGORIES) {
      await prisma.category.upsert({
        where: { slug: cat.slug },
        update: {
          name: cat.name,
          shortDescription: cat.shortDescription,
          iconUrl: cat.icon,
          bannerUrl: cat.bannerUrl || null,
          displayOrder: cat.displayOrder,
          isActive: true,
        },
        create: {
          id: cat.id,
          slug: cat.slug,
          name: cat.name,
          shortDescription: cat.shortDescription,
          iconUrl: cat.icon,
          bannerUrl: cat.bannerUrl || null,
          displayOrder: cat.displayOrder,
          isActive: true,
        },
      });
      console.log(`  ✓ Synced Category: ${cat.name} (${cat.slug})`);
    }

    console.log('\n--- 2. Importing Products, Variants, Images & Templates ---');
    for (const prod of FIXTURE_PRODUCTS) {
      const dbCat = await prisma.category.findUnique({
        where: { slug: prod.categorySlug },
      });

      if (!dbCat) {
        console.warn(`  ⚠ Warning: Category '${prod.categorySlug}' not found. Skipping product ${prod.title}`);
        continue;
      }

      await prisma.$transaction(async (tx) => {
        // Upsert Product
        const dbProduct = await tx.product.upsert({
          where: { slug: prod.slug },
          update: {
            sku: prod.sku,
            title: prod.title,
            shortSummary: prod.shortSummary,
            description: prod.description,
            categoryId: dbCat.id,
            basePricePaisa: prod.basePricePaisa,
            originalMspPaisa: prod.originalMspPaisa,
            isPersonalised: prod.isPersonalised,
            leadTimeDays: prod.leadTimeDays,
            minDeliveryDays: prod.minDeliveryDays,
            maxDeliveryDays: prod.maxDeliveryDays,
            ratingAverage: prod.ratingAverage,
            ratingCount: prod.ratingCount,
            stockStatus: prod.stockStatus,
            isActive: true,
          },
          create: {
            id: prod.id,
            sku: prod.sku,
            title: prod.title,
            slug: prod.slug,
            shortSummary: prod.shortSummary,
            description: prod.description,
            categoryId: dbCat.id,
            basePricePaisa: prod.basePricePaisa,
            originalMspPaisa: prod.originalMspPaisa,
            isPersonalised: prod.isPersonalised,
            leadTimeDays: prod.leadTimeDays,
            minDeliveryDays: prod.minDeliveryDays,
            maxDeliveryDays: prod.maxDeliveryDays,
            ratingAverage: prod.ratingAverage,
            ratingCount: prod.ratingCount,
            stockStatus: prod.stockStatus,
            isActive: true,
          },
        });

        // Sync Images
        await tx.productImage.deleteMany({ where: { productId: dbProduct.id } });
        for (let i = 0; i < prod.images.length; i++) {
          const img = prod.images[i];
          await tx.productImage.create({
            data: {
              productId: dbProduct.id,
              imageUrl: img.url,
              altText: img.alt,
              displayOrder: i,
              isPrimary: img.isPrimary,
            },
          });
        }

        // Sync Variants
        for (const v of prod.variants) {
          await tx.productVariant.upsert({
            where: { sku: v.sku },
            update: {
              title: v.title,
              attributeType: v.attributeType,
              attributeValue: v.attributeValue,
              additionalPaisa: v.additionalPaisa,
              stockQuantity: v.stockQuantity,
              isActive: v.isAvailable,
            },
            create: {
              id: v.id,
              productId: dbProduct.id,
              sku: v.sku,
              title: v.title,
              attributeType: v.attributeType,
              attributeValue: v.attributeValue,
              additionalPaisa: v.additionalPaisa,
              stockQuantity: v.stockQuantity,
              isActive: v.isAvailable,
            },
          });
        }

        // Sync Customisation Template
        if (prod.customisationTemplate) {
          const tmpl = prod.customisationTemplate;
          const dbTemplate = await tx.customisationTemplate.upsert({
            where: { id: tmpl.id },
            update: {
              templateKey: tmpl.templateKey,
              name: tmpl.name,
              description: tmpl.description,
              previewBaseImageUrl: tmpl.previewBaseImageUrl,
              schemaVersion: tmpl.schemaVersion,
              isActive: true,
            },
            create: {
              id: tmpl.id,
              productId: dbProduct.id,
              templateKey: tmpl.templateKey,
              name: tmpl.name,
              description: tmpl.description,
              previewBaseImageUrl: tmpl.previewBaseImageUrl,
              schemaVersion: tmpl.schemaVersion,
              isActive: true,
            },
          });

          await tx.customisationSlot.deleteMany({ where: { templateId: dbTemplate.id } });
          for (let sIdx = 0; sIdx < tmpl.slots.length; sIdx++) {
            const slot = tmpl.slots[sIdx];
            await tx.customisationSlot.create({
              data: {
                templateId: dbTemplate.id,
                slotKey: slot.slotKey,
                slotType: slot.slotType,
                label: slot.label,
                placeholder: slot.placeholder || null,
                required: slot.required,
                maxLength: slot.maxLength || null,
                optionsJson: slot.options ? JSON.stringify(slot.options) : null,
                helpText: slot.helpText || null,
                allowedMimesJson: slot.allowedMimes ? JSON.stringify(slot.allowedMimes) : null,
                maxFileSizeMb: slot.maxFileSizeMb || 15,
                aspectRatio: slot.aspectRatio || null,
                sortOrder: sIdx,
              },
            });
          }
        }
      });
      console.log(`  ✓ Synced Product: ${prod.title} (${prod.slug})`);
    }

    console.log('\n=====================================================');
    console.log('✓ Catalog Import Completed Successfully.');
    console.log('=====================================================');
  } catch (err: any) {
    console.error('Fatal import error:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
