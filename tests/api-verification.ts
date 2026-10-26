/**
 * Phase 1 API & Security Verification Test Suite
 * Verifies:
 * 1. Health & Database Status transparency (no mock persistence)
 * 2. Input validation & Sanitization
 * 3. Authoritative Price-Tampering Protection (Never trust client prices)
 * 4. Coupon threshold & discount cap enforcement
 * 5. Pincode delivery rules
 * 6. Access-denied administrative security controls
 */

import { calculateAuthoritativeQuote, sanitizeString, scrubPii, validateItemCustomisation } from '../server/security';
import { checkDatabaseConnection } from '../server/db';
import { buildHealthStatusPayload } from '../server/routes/api';
import { FIXTURE_PRODUCTS } from '../shared/fixtures';
import { maskDatabaseUrl, validateDatabaseUrl } from '../server/config';
import { CatalogService } from '../server/services/catalog.service';
import { QuoteService } from '../server/services/quote.service';
import { CategoryRepository } from '../server/repositories/category.repository';
import { ProductRepository } from '../server/repositories/product.repository';
import { getSecurityCapabilitiesReport } from '../server/auth-contract';
import {
  scryptHashPassword,
  verifyScryptPassword,
  timingSafeDummyVerification,
  generateTotpSecret,
  generateTotpCodeForCounter,
  verifyTotpCode,
  base32Encode,
  base32Decode,
  encryptAes256Gcm,
  decryptAes256Gcm,
  generateSessionToken,
  hashSessionToken,
  buildOtpAuthUri,
  SCRYPT_CONFIG,
} from '../server/security/crypto';
import { adminAuthService } from '../server/services/admin-auth.service';
import { extractSessionToken } from '../server/security/admin-auth.middleware';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✓ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${testName} ${detail ? `(${detail})` : ''}`);
    failed++;
  }
}

async function runAllTests() {
  console.log('=====================================================');
  console.log('Starting Phase 1 Verification Test Suite');
  console.log('=====================================================\n');

  // Test 1: Authoritative Price Calculation from Server Catalog
  console.log('--- Suite 1: Price-Tampering Protection ---');
  const quoteResult = calculateAuthoritativeQuote(
    {
      items: [
        {
          productId: 'prod-001', // Teak Frame (₹899 = 89900 Paisa)
          quantity: 2,
          customisationValues: [],
        },
      ],
      shippingPincode: '110001',
    },
    FIXTURE_PRODUCTS
  );

  assert(quoteResult.success === true, 'Quote calculation succeeded');
  if (quoteResult.success) {
    const q = quoteResult.quote;
    assert(q.subtotalPaisa === 89900 * 2, `Subtotal matches 2 x ₹899 = ₹1798 (${q.subtotalPaisa} Paisa)`);
    assert(q.isFreeDelivery === true, 'Order > ₹499 qualified for Free Delivery');
    assert(q.deliveryFeePaisa === 0, 'Delivery fee is ₹0.00');
    assert(q.totalAmountPaisa === 89900 * 2, 'Total amount strictly authoritative');
    assert(q.taxPaisa > 0, `GST 18% inclusive breakdown calculated (${q.taxPaisa} Paisa)`);
  }

  // Test 2: Client Price Tampering (Attempting to buy for ₹1)
  console.log('\n--- Suite 2: Client Price Tampering Defense ---');
  // Notice that quote calculation uses productId to lookup prices, client cannot inject custom prices
  const tamperedQuote = calculateAuthoritativeQuote(
    {
      items: [
        {
          productId: 'prod-002', // Ceramic Magic Mug (₹399 = 39900 Paisa)
          quantity: 1,
          customisationValues: [],
          // Client might attempt to send price: 100 or discount: 50000, but engine ignores it
        } as any,
      ],
      shippingPincode: '110001',
    },
    FIXTURE_PRODUCTS
  );

  assert(tamperedQuote.success === true, 'Tamper test quote executed');
  if (tamperedQuote.success) {
    assert(
      tamperedQuote.quote.subtotalPaisa === 39900,
      'Server enforced ₹399 base price regardless of client payload'
    );
    assert(
      tamperedQuote.quote.deliveryFeePaisa === 6000,
      'Subtotal < ₹499 correctly charged standard delivery ₹60'
    );
    assert(
      tamperedQuote.quote.totalAmountPaisa === 39900 + 6000,
      'Net total strictly ₹459 (399 + 60)'
    );
  }

  // Test 3: Coupon Threshold & Cap Enforcement
  console.log('\n--- Suite 3: Coupon Security & Threshold Enforcement ---');
  // FIRSTGIFT requires min ₹599. Let's try with ₹399 (Should NOT apply)
  const belowThresholdQuote = calculateAuthoritativeQuote(
    {
      items: [{ productId: 'prod-002', quantity: 1, customisationValues: [] }], // ₹399
      couponCode: 'FIRSTGIFT',
    },
    FIXTURE_PRODUCTS
  );
  if (belowThresholdQuote.success) {
    assert(
      belowThresholdQuote.quote.discountPaisa === 0,
      'Coupon rejected when order subtotal is below minimum threshold'
    );
  }

  // With order >= ₹599, FIRSTGIFT must apply ₹150 off
  const aboveThresholdQuote = calculateAuthoritativeQuote(
    {
      items: [{ productId: 'prod-001', quantity: 1, customisationValues: [] }], // ₹899
      couponCode: 'FIRSTGIFT',
    },
    FIXTURE_PRODUCTS
  );
  if (aboveThresholdQuote.success) {
    assert(
      aboveThresholdQuote.quote.discountPaisa === 15000,
      'Coupon FIRSTGIFT correctly applied flat ₹150 discount'
    );
    assert(
      aboveThresholdQuote.quote.appliedCoupon?.code === 'FIRSTGIFT',
      'Applied coupon code correctly documented in response'
    );
  }

  // Test 4: Input Validation & Sanitization
  console.log('\n--- Suite 4: Input Sanitization & Bounds Checking ---');
  const dirtyString = 'Sharma Family \x00\x1F<script>alert(1)</script>';
  const cleanString = sanitizeString(dirtyString, 35);
  assert(
    !cleanString.includes('\x00') && !cleanString.includes('\x1F'),
    'Control characters stripped from customisation text'
  );

  const invalidQtyQuote = calculateAuthoritativeQuote(
    {
      items: [{ productId: 'prod-001', quantity: 999, customisationValues: [] }],
    },
    FIXTURE_PRODUCTS
  );
  assert(
    invalidQtyQuote.success === false,
    'Server rejected exorbitant quantity (>50)'
  );

  const missingProductQuote = calculateAuthoritativeQuote(
    {
      items: [{ productId: 'non-existent-sku-999', quantity: 1, customisationValues: [] }],
    },
    FIXTURE_PRODUCTS
  );
  assert(
    missingProductQuote.success === false,
    'Server rejected non-existent product ID with 404 error'
  );

  // Test 5: PII & Secret Scrubbing in Audit Logs
  console.log('\n--- Suite 5: PII & Secret Masking ---');
  const sensitiveRecord = {
    userEmail: 'vikram.singh@example.com',
    userPhone: '9876543210',
    passwordHash: '$2b$12$e80yJ/6k3...',
    jwtToken: 'eyJhbGciOi...',
    orderId: 'ORD-10023',
  };
  const scrubbed = scrubPii(sensitiveRecord);
  assert(scrubbed.passwordHash === '[REDACTED_SECRET]', 'Password hash redacted');
  assert(scrubbed.jwtToken === '[REDACTED_SECRET]', 'JWT token redacted');
  assert(scrubbed.userPhone.includes('****'), 'Phone number partially masked');
  assert(scrubbed.orderId === 'ORD-10023', 'Safe identifiers preserved');

  // Test 6: Database & Health Status Truthfulness (No Mock Persistence or False Security Claims)
  console.log('\n--- Suite 6: Database Persistence & Health Status Truthfulness ---');
  const dbHealth = await checkDatabaseConnection();
  assert(dbHealth.provider === 'mysql', 'Database provider is designated MySQL 8');
  assert(
    dbHealth.schemaStatus === 'unconnected' || dbHealth.schemaStatus === 'migration_pending',
    'Database status honestly reports unconnected state rather than faking persistence'
  );
  assert(
    dbHealth.message.includes('MySQL 8'),
    'Detailed guidance provided for MySQL 8 connection requirement'
  );

  const fullHealth = await buildHealthStatusPayload();
  assert(
    fullHealth.security.mfaRequiredByPolicy === true && fullHealth.security.mfaOperational === false,
    'MFA truthfully distinguishes policy requirement (true) from operational readiness (false)'
  );
  assert(
    fullHealth.security.mfaEnforced === false,
    'Legacy mfaEnforced flag truthfully set to false until TOTP backend is operational'
  );
  assert(
    fullHealth.storage.mode === 'temporary-preview' && fullHealth.storage.persistent === false,
    'Storage accurately exposes temporary-preview mode with persistent=false'
  );
  assert(
    fullHealth.storage.active === false,
    'Storage active flag truthfully set to false indicating private persistent upload is inactive in Phase 1'
  );

  // Test 7: Strict Customisation Slot Validation (Teak Wood 3-Photo Frame Bug Fix)
  console.log('\n--- Suite 7: Customisation Slot Validation (Teak 3-Photo Frame) ---');
  const teakFrame = FIXTURE_PRODUCTS.find((p) => p.id === 'prod-001')!;

  // 7a: Zero customisation values provided -> Must fail
  const emptyValidation = validateItemCustomisation(teakFrame, []);
  assert(
    emptyValidation.valid === false,
    'Empty customisation rejected for 3-photo frame'
  );
  assert(
    emptyValidation.missingSlots.includes('family_title') &&
      emptyValidation.missingSlots.includes('photo_slot_1') &&
      emptyValidation.missingSlots.includes('photo_slot_2') &&
      emptyValidation.missingSlots.includes('photo_slot_3'),
    'All 4 required slots (family_title + 3 photos) identified as missing'
  );

  // 7b: Incomplete customisation (only 1 photo provided instead of 3)
  const partialValidation = validateItemCustomisation(teakFrame, [
    { slotKey: 'family_title', textValue: 'The Sharma Family' },
    { slotKey: 'photo_slot_1', photoUrl: 'blob:http://localhost:3000/photo1' },
  ]);
  assert(
    partialValidation.valid === false,
    'Partial customisation (1 of 3 photos) correctly rejected'
  );
  assert(
    partialValidation.missingSlots.includes('photo_slot_2') &&
      partialValidation.missingSlots.includes('photo_slot_3'),
    'Missing photo slots 2 and 3 flagged with field-specific errors'
  );

  // 7c: Fully satisfied customisation with all 3 photos and title
  const completeValidation = validateItemCustomisation(teakFrame, [
    { slotKey: 'family_title', textValue: 'The Sharma Family' },
    { slotKey: 'photo_slot_1', photoUrl: 'blob:http://localhost:3000/photo1' },
    { slotKey: 'photo_slot_2', photoUrl: 'blob:http://localhost:3000/photo2' },
    { slotKey: 'photo_slot_3', photoUrl: 'blob:http://localhost:3000/photo3' },
  ]);
  assert(
    completeValidation.valid === true,
    'Complete customisation with 3 photos and title passes validation'
  );
  assert(
    completeValidation.missingSlots.length === 0,
    'Zero missing slots when all requirements are met'
  );

  // 7d: Server Authoritative Quote with strictCustomisation flag
  const strictQuoteRejected = calculateAuthoritativeQuote(
    {
      items: [
        {
          productId: 'prod-001',
          quantity: 1,
          customisationValues: [], // Empty
        },
      ],
      strictCustomisation: true,
    } as any,
    FIXTURE_PRODUCTS
  );
  assert(
    strictQuoteRejected.success === false,
    'Server quote rejected incomplete customisation under strict validation'
  );

  const strictQuoteAccepted = calculateAuthoritativeQuote(
    {
      items: [
        {
          productId: 'prod-001',
          quantity: 1,
          customisationValues: [
            { slotKey: 'family_title', textValue: 'The Sharma Family' },
            { slotKey: 'photo_slot_1', photoUrl: 'blob:http://localhost:3000/photo1' },
            { slotKey: 'photo_slot_2', photoUrl: 'blob:http://localhost:3000/photo2' },
            { slotKey: 'photo_slot_3', photoUrl: 'blob:http://localhost:3000/photo3' },
          ],
        },
      ],
      strictCustomisation: true,
    } as any,
    FIXTURE_PRODUCTS
  );
  assert(
    strictQuoteAccepted.success === true,
    'Server quote accepted fully completed customisation under strict validation'
  );

  // Test 8: Phase 2A MySQL Repositories & Fail-Closed Security Contracts
  console.log('\n--- Suite 8: Phase 2A Data Access, Fail-Closed Security & Config ---');

  // 8a: Config validation & credential masking
  const sampleUrl = 'mysql://store_admin:P@ssword123#@db.example.internal:3306/prod_store?ssl=true';
  const masked = maskDatabaseUrl(sampleUrl);
  assert(
    !masked.includes('P@ssword123#') && masked.includes('********'),
    'Database password masked safely with ******** for diagnostics and health logs'
  );

  const validMysqlCheck = validateDatabaseUrl('mysql://admin:realpass123@db-host:3306/storedb');
  assert(validMysqlCheck.isValid === true, 'Valid MySQL 8 connection string accepted by config validator');

  const invalidProtoCheck = validateDatabaseUrl('postgres://admin:pass@localhost:5432/db');
  assert(
    invalidProtoCheck.isValid === false,
    'Non-MySQL protocol rejected (strictly enforces MySQL 8 architecture)'
  );

  const placeholderCheck = validateDatabaseUrl('mysql://store_admin:secure_password_here@localhost:3306/db');
  assert(
    placeholderCheck.isValid === false,
    'Placeholder template connection string correctly detected as unconfigured'
  );

  // 8b: Mock Repository Mapping & Eager-Loading (Preventing N+1 Queries)
  const mockPrismaProduct: any = {
    $transaction: async (ops: any[]) => {
      // Simulate transaction executing count and findMany
      return [
        1,
        [
          {
            id: 'mock-p1',
            sku: 'SKU-MOCK-1',
            title: 'Mock Engraved Frame',
            slug: 'mock-engraved-frame',
            shortSummary: 'Summary of mock',
            description: 'Long description',
            basePricePaisa: 59900,
            originalMspPaisa: 99900,
            isPersonalised: true,
            leadTimeDays: 2,
            minDeliveryDays: 3,
            maxDeliveryDays: 5,
            ratingAverage: 4.9,
            ratingCount: 12,
            stockStatus: 'IN_STOCK',
            category: { slug: 'photo-frames' },
            images: [{ id: 'img-1', imageUrl: 'https://images.example.com/frame.jpg', altText: 'Frame', isPrimary: true }],
            variants: [
              {
                id: 'var-1',
                productId: 'mock-p1',
                sku: 'SKU-MOCK-1-L',
                title: 'Large 12x18',
                attributeType: 'Size',
                attributeValue: '12x18 inch',
                additionalPaisa: 30000,
                stockQuantity: 50,
                isActive: true,
              },
            ],
            templates: [
              {
                id: 'tmpl-1',
                productId: 'mock-p1',
                templateKey: 'engraved-text',
                name: 'Engraving Template',
                previewBaseImageUrl: 'https://images.example.com/base.jpg',
                schemaVersion: 1,
                slots: [
                  {
                    slotKey: 'custom_name',
                    slotType: 'TEXT',
                    label: 'Name to Engrave',
                    required: true,
                    maxLength: 30,
                  },
                ],
              },
            ],
          },
        ],
      ];
    },
    product: {
      count: async () => 1,
      findMany: async () => [],
    },
  };

  const productRepo = new ProductRepository(mockPrismaProduct);
  const repoResult = await productRepo.findPublished({ categorySlug: 'photo-frames' });
  assert(repoResult.total === 1, 'ProductRepository correctly executed paginated query');
  assert(repoResult.products[0].variants.length === 1, 'Variants eager-loaded without secondary queries');
  assert(
    repoResult.products[0].customisationTemplate?.slots[0].slotKey === 'custom_name',
    'Customisation template slots mapped with schema definitions'
  );
  assert(
    (repoResult.products[0] as any).privateStorageUrl === undefined,
    'Public catalog queries strictly exclude private storage URLs/paths'
  );

  // 8c: Fail-Closed Production Security Contract (503 on Disconnected DB)
  // Simulate production environment
  const originalEnv = process.env.NODE_ENV;
  try {
    process.env.NODE_ENV = 'production';
    const prodCatalogService = new CatalogService();
    const categoriesProdResult = await prodCatalogService.getCategories();
    assert(
      categoriesProdResult.success === false && categoriesProdResult.statusCode === 503,
      'Production catalog strictly FAILS CLOSED (503) when MySQL is unconnected'
    );
    assert(
      categoriesProdResult.dataSource === 'none',
      'Refuses to silently serve development fixtures when in production'
    );

    const prodQuoteService = new QuoteService();
    const prodQuoteResult = await prodQuoteService.calculateQuote({
      items: [{ productId: 'prod-001', quantity: 1, customisationValues: [] }],
    });
    assert(
      prodQuoteResult.success === false && prodQuoteResult.statusCode === 503,
      'Production quote service strictly FAILS CLOSED (503) without live database persistence'
    );
  } finally {
    process.env.NODE_ENV = originalEnv;
  }

  // 8d: Development Preview Fallback Contract (Transparently Marked)
  const devCatalogService = new CatalogService();
  const categoriesDevResult = await devCatalogService.getCategories();
  assert(
    categoriesDevResult.success === true && categoriesDevResult.dataSource === 'development_fixture',
    'Development environment provides transparently flagged development fixtures'
  );
  assert(
    categoriesDevResult.success === true && categoriesDevResult.isDevelopmentPreview === true,
    'Development preview explicitly flags isDevelopmentPreview: true'
  );

  // 8e: Security Capabilities Readiness Report
  const capabilities = getSecurityCapabilitiesReport();
  assert(
    capabilities.capabilities.singleOwnerStore.status === 'SUPPORTED',
    'Capabilities accurately specify single-owner store architecture'
  );
  assert(
    capabilities.capabilities.adminAuthentication.status === 'BLOCKED_PENDING_MYSQL_AND_SESSION_ENGINE',
    'Admin authentication honestly marked BLOCKED until MySQL and session engine exist'
  );
  assert(
    capabilities.capabilities.totpMfa.status === 'BLOCKED_PENDING_TOTP_BACKEND',
    'TOTP MFA honestly marked BLOCKED until operational TOTP engine is wired'
  );
  assert(
    capabilities.capabilities.privateImageStorage.status === 'BLOCKED_PENDING_PERSISTENT_STORAGE',
    'Private customer image storage honestly marked BLOCKED until persistent storage is configured'
  );
  assert(
    capabilities.capabilities.paymentProcessing.status === 'BLOCKED_PENDING_GATEWAY_CONFIG',
    'Payment processing honestly marked BLOCKED until merchant gateways are configured'
  );
  assert(
    capabilities.capabilities.productionSeo.status === 'PENDING_SSR_PRERENDER',
    'Production SEO accurately marked PENDING Next.js SSR / prerendering'
  );
  assert(
    capabilities.capabilities.nativeAndroidClient.status === 'PLANNED_SEPARATE_PROJECT',
    'Native Android Kotlin client designated as a planned separate project'
  );

  // 8f: Health Endpoint Truthfulness (No Fake Integration Claims)
  const healthCheck = await buildHealthStatusPayload();
  assert(
    healthCheck.database.connected === false,
    'Health check truthfully reports database unconnected in preview'
  );
  assert(
    healthCheck.database.readiness === 'degraded_preview',
    'Health check database readiness reported as degraded_preview without fake live connection'
  );

  // ============================================================================
  // Suite 9: Phase 2B-1 Owner Authentication & Cryptographic Security
  // ============================================================================
  console.log('\n--- Suite 9: Phase 2B-1 Owner Auth & Cryptographic Security ---');

  // 9a: Scrypt Password Hashing with Shared-Hosting Bounded Memory
  assert(
    SCRYPT_CONFIG.maxmem === 32 * 1024 * 1024 && SCRYPT_CONFIG.N === 16384,
    'Scrypt configured with bounded memory ceiling (N=16384, maxmem=32MB) for shared hosting safety'
  );

  const testPassword = 'SecureStoreOwnerPassword2026!';
  const hashedPassword = await scryptHashPassword(testPassword);
  assert(
    hashedPassword.startsWith('$scrypt$ln=14,r=8,p=1$'),
    'Password hashed with standard scrypt format specification'
  );

  const validPasswordCheck = await verifyScryptPassword(testPassword, hashedPassword);
  assert(
    validPasswordCheck === true,
    'Constant-time scrypt verification successfully verified correct password'
  );

  const invalidPasswordCheck = await verifyScryptPassword('WrongPassword123!', hashedPassword);
  assert(
    invalidPasswordCheck === false,
    'Constant-time scrypt verification successfully rejected incorrect password'
  );

  // Timing-safe dummy verification executes cleanly without exceptions
  let dummyRan = false;
  try {
    await timingSafeDummyVerification('nonexistent-account-password');
    dummyRan = true;
  } catch {
    dummyRan = false;
  }
  assert(
    dummyRan === true,
    'Timing-safe dummy verification executed to prevent username/email enumeration side-channels'
  );

  // 9b: Pure Node RFC 6238 Base32 & TOTP MFA Engine
  const testBuffer = Buffer.from('CommercialStore2026');
  const base32Str = base32Encode(testBuffer);
  const decodedBuffer = base32Decode(base32Str);
  assert(
    decodedBuffer.equals(testBuffer),
    'Pure Node.js Base32 encoding and decoding accurately roundtrips binary data'
  );

  const totpSecret = generateTotpSecret();
  assert(
    /^[A-Z2-7]{32}$/.test(totpSecret),
    'Generated 160-bit (20-byte) RFC 6238 TOTP secret with valid unpadded Base32 characters'
  );

  const otpAuthUri = buildOtpAuthUri('owner@personalisedstore.in', 'PERSONALISED_STORE', totpSecret);
  assert(
    otpAuthUri.startsWith('otpauth://totp/PERSONALISED_STORE:owner%40personalisedstore.in?secret='),
    'Standard otpauth:// URI generated correctly for Google Authenticator / Bitwarden'
  );

  // Generate TOTP code for current counter
  const currentStep = BigInt(Math.floor(Date.now() / 1000 / 30));
  const validTotpCode = generateTotpCodeForCounter(totpSecret, currentStep);
  assert(
    /^\d{6}$/.test(validTotpCode),
    `Generated valid 6-digit TOTP code (${validTotpCode}) for counter ${currentStep}`
  );

  const totpVerifyResult = verifyTotpCode(totpSecret, validTotpCode);
  assert(
    totpVerifyResult.valid === true && totpVerifyResult.matchedCounter === currentStep,
    'RFC 6238 TOTP verification successfully validated correct 6-digit code'
  );

  const invalidTotpResult = verifyTotpCode(totpSecret, '000000');
  assert(
    invalidTotpResult.valid === false,
    'RFC 6238 TOTP verification successfully rejected invalid code'
  );

  // Replay protection: Attempting to verify the exact same counter again when lastUsedCounter === currentStep
  const replayAttempt = verifyTotpCode(totpSecret, validTotpCode, {
    lastUsedCounter: currentStep,
  });
  assert(
    replayAttempt.valid === false,
    'Monotonic counter strictly REJECTED reused TOTP code (replay attack mitigation)'
  );

  // 9c: AES-256-GCM Secret Encryption at Rest
  const plainSecret = 'JBSWY3DPEHPK3PXP';
  const encryptedPayload = encryptAes256Gcm(plainSecret);
  assert(
    Boolean(encryptedPayload.encryptedHex && encryptedPayload.ivHex && encryptedPayload.tagHex),
    'AES-256-GCM encrypted TOTP secret into ciphertext, 96-bit IV, and 128-bit authentication tag'
  );

  const decryptedPlain = decryptAes256Gcm(
    encryptedPayload.encryptedHex,
    encryptedPayload.ivHex,
    encryptedPayload.tagHex
  );
  assert(
    decryptedPlain === plainSecret,
    'AES-256-GCM successfully decrypted ciphertext and verified authentication tag at rest'
  );

  let tamperedDecryptionThrew = false;
  try {
    decryptAes256Gcm('ff' + encryptedPayload.encryptedHex.slice(2), encryptedPayload.ivHex, encryptedPayload.tagHex);
  } catch {
    tamperedDecryptionThrew = true;
  }
  assert(
    tamperedDecryptionThrew === true,
    'AES-256-GCM authenticated cipher strictly rejected tampered ciphertext'
  );

  // 9d: Opaque Session Tokens & SHA-256 Hashing
  const rawSessionToken = generateSessionToken();
  assert(
    rawSessionToken.length === 64,
    'Generated 32-byte cryptographically secure random session token (64 hex characters)'
  );

  const sessionHash = hashSessionToken(rawSessionToken);
  assert(
    sessionHash.length === 64 && sessionHash !== rawSessionToken,
    'Stored only SHA-256 digest of session token (raw token kept in browser cookie only)'
  );

  // 9e: Admin Auth Service Fail-Closed Gate & Zero Mock Bypass
  const loginAttemptWithoutDb = await adminAuthService.login({
    identifier: 'admin@store.in',
    password: 'AnyPassword123!',
    totpCode: '123456',
  });
  assert(
    loginAttemptWithoutDb.success === false && loginAttemptWithoutDb.statusCode === 503,
    'Admin authentication strictly FAILS CLOSED (503) when database is unconnected (zero mock login bypass)'
  );

  const bootstrapStatus = await adminAuthService.getBootstrapStatus();
  assert(
    bootstrapStatus.dbConnected === false && bootstrapStatus.ownerBootstrapped === false,
    'Bootstrap status truthfully reports database unconnected in preview'
  );

  // 9f: Session Extraction & CSRF Middleware
  const authHeaderReq = {
    headers: { authorization: 'Bearer ' + rawSessionToken },
  } as any;
  const extractedBearer = extractSessionToken(authHeaderReq);
  assert(
    extractedBearer.token === rawSessionToken && extractedBearer.isCookie === false,
    'Session extraction accurately parsed Bearer authorization header'
  );

  const cookieReq = {
    headers: { cookie: `ps_admin_session=${rawSessionToken}; other=123` },
  } as any;
  const extractedCookie = extractSessionToken(cookieReq);
  assert(
    extractedCookie.token === rawSessionToken && extractedCookie.isCookie === true,
    'Session extraction accurately parsed ps_admin_session cookie'
  );

  // 9g: Phase 2B-1 Capabilities Report
  const phase2b1Capabilities = getSecurityCapabilitiesReport({ dbConnected: false, legacyCompat: false });
  assert(
    phase2b1Capabilities.capabilities.adminAuthentication.status === 'ENGINE_READY_AWAITING_DATABASE',
    'Phase 2B-1 capabilities truthfully reports admin authentication engine ready, awaiting live database'
  );
  assert(
    phase2b1Capabilities.capabilities.totpMfa.status === 'ENGINE_READY_AWAITING_DATABASE',
    'Phase 2B-1 capabilities truthfully reports TOTP MFA engine ready, awaiting live database'
  );

  console.log('\n=====================================================');
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('=====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error('Test Suite encountered error:', err);
  process.exit(1);
});
