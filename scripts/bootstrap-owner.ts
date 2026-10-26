#!/usr/bin/env tsx
/**
 * CLI Store Owner Bootstrap Tool
 * Single-Owner Commercial Personalised Commerce Platform
 * 
 * Rules:
 * 1. Strictly refuses if database is unreachable.
 * 2. Strictly refuses if an owner/superadmin already exists (single-owner policy).
 * 3. Enforces strong password (min 12 chars).
 * 4. Generates RFC 6238 TOTP secret and REQUIRES verification of the first 6-digit
 *    code before any persistent database write.
 * 5. Uses Node.js crypto scrypt hashing and AES-256-GCM secret encryption at rest.
 * 
 * Usage:
 *   npx tsx scripts/bootstrap-owner.ts --email=owner@store.in --name="Store Owner" --password=... --totp=123456
 *   OR interactive prompt.
 */

import readline from 'readline';
import { checkDatabaseConnection, initPrismaClient } from '../server/db';
import { adminRepository } from '../server/repositories/admin.repository';
import {
  generateTotpSecret,
  verifyTotpCode,
  buildOtpAuthUri,
  scryptHashPassword,
  encryptAes256Gcm,
} from '../server/security/crypto';

// Parse command line arguments
function parseArgs(): Record<string, string> {
  const args: Record<string, string> = {};
  for (const arg of process.argv.slice(2)) {
    if (arg.startsWith('--')) {
      const [key, ...vals] = arg.slice(2).split('=');
      args[key] = vals.join('=');
    }
  }
  return args;
}

function promptAsync(rl: readline.Interface, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function runBootstrap() {
  console.log('=============================================================');
  console.log('  PERSONALISED STORE - SINGLE-OWNER BOOTSTRAP WIZARD (Phase 2B-1)');
  console.log('=============================================================\n');

  // Step 1: Check Database Connectivity
  console.log('[1/5] Verifying database connectivity...');
  initPrismaClient();
  const dbState = await checkDatabaseConnection();

  if (!dbState.connected) {
    console.error('\n[FATAL] Database is NOT connected or unreachable.');
    console.error(`Status: ${dbState.message}`);
    console.error('Owner bootstrap strictly requires a live, operational MySQL 8 / MariaDB 10+ instance.');
    console.error('Please configure DATABASE_URL and run "npx prisma migrate deploy" before bootstrapping.\n');
    process.exit(1);
  }
  console.log(`  ✓ Database connected successfully (${dbState.provider} @ ${dbState.databaseUrlMasked})`);

  // Step 2: Enforce Single-Owner Policy
  console.log('\n[2/5] Checking single-owner policy status...');
  const ownerCount = await adminRepository.getOwnerCount();
  if (ownerCount > 0) {
    console.error('\n[FATAL] Single-Owner Policy Enforced: An administrative owner already exists.');
    console.error('This platform strictly prohibits multiple store owners.');
    console.error('To reset credentials, use the secure recovery workflow or manage via database admin.\n');
    process.exit(1);
  }
  console.log('  ✓ No existing owner found. System ready for one-time owner bootstrap.');

  // Step 3: Collect Owner Credentials
  console.log('\n[3/5] Setting up Owner Identity...');
  const cliArgs = parseArgs();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  let email = cliArgs.email || process.env.BOOTSTRAP_OWNER_EMAIL || '';
  let fullName = cliArgs.name || process.env.BOOTSTRAP_OWNER_NAME || '';
  let phone = cliArgs.phone || process.env.BOOTSTRAP_OWNER_PHONE || '';
  let password = cliArgs.password || process.env.BOOTSTRAP_OWNER_PASSWORD || '';

  if (!email && process.stdin.isTTY) {
    email = await promptAsync(rl, 'Enter Store Owner Email: ');
  }
  if (!fullName && process.stdin.isTTY) {
    fullName = await promptAsync(rl, 'Enter Store Owner Full Name: ');
  }
  if (!phone && process.stdin.isTTY) {
    phone = await promptAsync(rl, 'Enter Store Owner Phone (optional, press Enter to skip): ');
  }
  if (!password && process.stdin.isTTY) {
    password = await promptAsync(rl, 'Enter Strong Admin Password (min 12 chars): ');
  }

  if (!email || !email.includes('@')) {
    console.error('\n[ERROR] Valid email is required for store owner identity.');
    rl.close();
    process.exit(1);
  }
  if (!fullName) {
    console.error('\n[ERROR] Full name is required.');
    rl.close();
    process.exit(1);
  }
  if (!password || password.length < 12) {
    console.error('\n[ERROR] Password must be at least 12 characters long for store administrator security.');
    rl.close();
    process.exit(1);
  }

  // Step 4: RFC 6238 TOTP Setup & Mandatory Verification
  console.log('\n[4/5] Mandatory TOTP MFA Enrollment...');
  const totpSecret = generateTotpSecret();
  const otpAuthUri = buildOtpAuthUri(email, 'PERSONALISED_STORE', totpSecret);

  console.log('\n-------------------------------------------------------------');
  console.log('  SCAN OR ENTER THIS SECRET INTO YOUR AUTHENTICATOR APP:');
  console.log(`  Secret Key:  ${totpSecret}`);
  console.log(`  Account:     ${email}`);
  console.log(`  Issuer:      PERSONALISED_STORE`);
  console.log(`  URI:         ${otpAuthUri}`);
  console.log('-------------------------------------------------------------\n');

  let totpCode = cliArgs.totp || process.env.BOOTSTRAP_TOTP_CODE || '';
  if (!totpCode && process.stdin.isTTY) {
    totpCode = await promptAsync(rl, 'Enter the 6-digit code shown in your authenticator app to confirm setup: ');
  }
  rl.close();

  if (!totpCode) {
    console.error('\n[FATAL] MFA enrollment was not verified. Owner bootstrap aborted.');
    process.exit(1);
  }

  const verification = verifyTotpCode(totpSecret, totpCode);
  if (!verification.valid || verification.matchedCounter == null) {
    console.error(`\n[FATAL] TOTP verification failed: ${verification.reason || 'Invalid code'}.`);
    console.error('Owner bootstrap aborted. No records were written to the database.\n');
    process.exit(1);
  }

  console.log('  ✓ TOTP Code successfully verified against secret!');

  // Step 5: Secure Persistence (scrypt + AES-256-GCM)
  console.log('\n[5/5] Encrypting and persisting store owner in MySQL...');
  console.log('  - Hashing password with scrypt (N=16384, r=8, p=1, maxmem=32MB)...');
  const passwordHash = await scryptHashPassword(password);

  console.log('  - Encrypting TOTP secret at rest using AES-256-GCM...');
  const encryptedMfa = encryptAes256Gcm(totpSecret);

  const owner = await adminRepository.createBootstrapOwner({
    email,
    fullName,
    phone: phone || undefined,
    passwordHash,
    mfaSecretEncrypted: encryptedMfa.encryptedHex,
    mfaSecretIv: encryptedMfa.ivHex,
    mfaSecretTag: encryptedMfa.tagHex,
    initialTotpCounter: verification.matchedCounter,
  });

  console.log('\n=============================================================');
  console.log('  ✓ STORE OWNER BOOTSTRAP COMPLETED SUCCESSFULLY');
  console.log('=============================================================');
  console.log(`  Owner ID:    ${owner.id}`);
  console.log(`  Email:       ${owner.email}`);
  console.log(`  Role:        ${owner.role}`);
  console.log(`  MFA Status:  ACTIVE (RFC 6238 TOTP Enforced)`);
  console.log(`  Timestamp:   ${new Date().toISOString()}`);
  console.log('\nYou may now log in to the administrative portal using your email, password, and authenticator app.');
  process.exit(0);
}

runBootstrap().catch((err) => {
  console.error('\n[FATAL] Unexpected error during bootstrap:', err);
  process.exit(1);
});
