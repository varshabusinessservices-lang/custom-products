/**
 * Security & Owner Bootstrap Contract Specification
 * Defines interfaces, contracts, and gated readiness for store owner and authentication.
 * Phase 2B-1: Production Scrypt, RFC 6238 TOTP, and Session Engine implemented.
 */

export interface SecurityCapabilitiesReport {
  phase: string;
  architecture: string;
  capabilities: {
    singleOwnerStore: {
      status: 'SUPPORTED';
      notes: string;
    };
    adminAuthentication: {
      status: 'ENGINE_READY_AWAITING_DATABASE' | 'OPERATIONAL' | 'BLOCKED_PENDING_MYSQL_AND_SESSION_ENGINE';
      notes: string;
    };
    totpMfa: {
      status: 'ENGINE_READY_AWAITING_DATABASE' | 'OPERATIONAL' | 'BLOCKED_PENDING_TOTP_BACKEND';
      notes: string;
    };
    privateImageStorage: {
      status: 'BLOCKED_PENDING_PERSISTENT_STORAGE';
      notes: string;
    };
    paymentProcessing: {
      status: 'BLOCKED_PENDING_GATEWAY_CONFIG';
      notes: string;
    };
    productionSeo: {
      status: 'PENDING_SSR_PRERENDER';
      notes: string;
    };
    nativeAndroidClient: {
      status: 'PLANNED_SEPARATE_PROJECT';
      notes: string;
    };
  };
}

export function getSecurityCapabilitiesReport(options?: {
  dbConnected?: boolean;
  ownerBootstrapped?: boolean;
  legacyCompat?: boolean;
}): SecurityCapabilitiesReport {
  const isLegacy = options?.legacyCompat ?? (options === undefined || options.dbConnected === undefined);
  const isConnected = options?.dbConnected ?? false;
  const isBootstrapped = options?.ownerBootstrapped ?? false;

  let adminStatus: SecurityCapabilitiesReport['capabilities']['adminAuthentication']['status'];
  let adminNotes: string;

  let totpStatus: SecurityCapabilitiesReport['capabilities']['totpMfa']['status'];
  let totpNotes: string;

  if (isLegacy) {
    adminStatus = 'BLOCKED_PENDING_MYSQL_AND_SESSION_ENGINE';
    adminNotes = 'No mock logins or hardcoded tokens permitted. Blocked until live MySQL 8 and secure Argon2id/JWT are wired.';
    totpStatus = 'BLOCKED_PENDING_TOTP_BACKEND';
    totpNotes = 'MFA is required by administrative policy but operational TOTP engine is pending.';
  } else if (isConnected && isBootstrapped) {
    adminStatus = 'OPERATIONAL';
    adminNotes = 'Owner authentication active with scrypt password verification and SHA-256 session tokens.';
    totpStatus = 'OPERATIONAL';
    totpNotes = 'RFC 6238 TOTP verification is active and enforced on all administrative logins.';
  } else {
    adminStatus = 'ENGINE_READY_AWAITING_DATABASE';
    adminNotes = 'Node.js 22 crypto scrypt + SHA-256 session engine compiled. Operational login awaits live MySQL/MariaDB connection and CLI bootstrap. No mock bypasses permitted.';
    totpStatus = 'ENGINE_READY_AWAITING_DATABASE';
    totpNotes = 'RFC 6238 TOTP HMAC-SHA1 engine with replay protection and AES-256-GCM encryption is implemented. Activates upon database connection and owner bootstrap.';
  }

  return {
    phase: 'Phase 2B-1 (Owner Authentication & Hostinger Runbook)',
    architecture: 'Single-Owner Indian Personalised Commerce',
    capabilities: {
      singleOwnerStore: {
        status: 'SUPPORTED',
        notes: 'Platform strictly enforces single-owner store architecture with no multi-vendor modules.',
      },
      adminAuthentication: {
        status: adminStatus,
        notes: adminNotes,
      },
      totpMfa: {
        status: totpStatus,
        notes: totpNotes,
      },
      privateImageStorage: {
        status: 'BLOCKED_PENDING_PERSISTENT_STORAGE',
        notes: 'In-browser canvas preview active. Persistent private customer uploads blocked until S3/local private driver is configured.',
      },
      paymentProcessing: {
        status: 'BLOCKED_PENDING_GATEWAY_CONFIG',
        notes: 'Order creation and payment gateways (Razorpay/Cashfree/PhonePe) gated until merchant API keys are configured.',
      },
      productionSeo: {
        status: 'PENDING_SSR_PRERENDER',
        notes: 'Current runtime is client-rendered React SPA preview. Production SEO requires Next.js SSR / prerendering.',
      },
      nativeAndroidClient: {
        status: 'PLANNED_SEPARATE_PROJECT',
        notes: 'Separate Android Kotlin + Jetpack Compose app consuming this versioned REST API is planned as an independent project.',
      },
    },
  };
}
