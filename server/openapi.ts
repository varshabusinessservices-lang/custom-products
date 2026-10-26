/**
 * OpenAPI 3.1 Specification for Personalised Indian E-Commerce Platform
 * Version: 1.0.0
 * Designed for both Web clients and the Planned Native Android Kotlin + Jetpack Compose app.
 */

export const openApiSpecification = {
  openapi: '3.1.0',
  info: {
    title: 'Personalised Indian E-Commerce Platform REST API',
    version: '1.0.0',
    description:
      'Commercial REST API v1 for single-owner personalised products store (photo frames, mugs, cushions, calendars, keychains, wall art). Designed for Node.js 22 + MySQL 8 + Prisma and native Android Jetpack Compose consumer.',
    contact: {
      name: 'Store Lead Architecture & Security Team',
    },
  },
  servers: [
    {
      url: '/api/v1',
      description: 'Primary Express API v1 Endpoint',
    },
  ],
  paths: {
    '/health': {
      get: {
        summary: 'System & Database Health Check',
        description: 'Returns real-time service health, database connection state, schema status, and security posture.',
        responses: {
          '200': {
            description: 'Health report successfully generated',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/HealthStatusResponse',
                },
              },
            },
          },
        },
      },
    },
    '/auth/capabilities': {
      get: {
        summary: 'Security & Operational Readiness Contract',
        description: 'Exposes current status of single-owner store capabilities, blocked modules, and pending dependencies.',
        responses: {
          '200': {
            description: 'Capabilities report',
          },
        },
      },
    },
    '/catalog/categories': {
      get: {
        summary: 'List Product Categories',
        description: 'Returns all active product categories with hierarchy and product counts from MySQL or development fixtures.',
        responses: {
          '200': {
            description: 'List of active categories',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    count: { type: 'integer' },
                    categories: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Category' },
                    },
                    dataSource: { type: 'string', enum: ['mysql', 'development_fixture'] },
                    isDevelopmentPreview: { type: 'boolean' },
                  },
                },
              },
            },
          },
          '503': { description: 'Database unavailable in production environment (fail closed)' },
        },
      },
    },
    '/catalog/products': {
      get: {
        summary: 'Search and Filter Products',
        parameters: [
          { name: 'category', in: 'query', schema: { type: 'string' }, description: 'Filter by category slug' },
          { name: 'q', in: 'query', schema: { type: 'string' }, description: 'Search term' },
          { name: 'minPrice', in: 'query', schema: { type: 'integer' }, description: 'Minimum price in Paisa' },
          { name: 'maxPrice', in: 'query', schema: { type: 'integer' }, description: 'Maximum price in Paisa' },
          { name: 'sort', in: 'query', schema: { type: 'string', enum: ['popular', 'price_asc', 'price_desc', 'rating'] } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 }, description: 'Pagination page number' },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 20 }, description: 'Items per page (max 100)' },
        ],
        responses: {
          '200': {
            description: 'Filtered list of products',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    total: { type: 'integer' },
                    products: {
                      type: 'array',
                      items: { $ref: '#/components/schemas/Product' },
                    },
                    page: { type: 'integer' },
                    limit: { type: 'integer' },
                    totalPages: { type: 'integer' },
                    dataSource: { type: 'string', enum: ['mysql', 'development_fixture'] },
                    isDevelopmentPreview: { type: 'boolean' },
                  },
                },
              },
            },
          },
          '503': { description: 'Database unavailable in production environment (fail closed)' },
        },
      },
    },
    '/catalog/products/{slug}': {
      get: {
        summary: 'Get Product Detail by Slug',
        parameters: [
          { name: 'slug', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Product detail with variants and customisation template',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean' },
                    product: { $ref: '#/components/schemas/Product' },
                    dataSource: { type: 'string', enum: ['mysql', 'development_fixture'] },
                    isDevelopmentPreview: { type: 'boolean' },
                  },
                },
              },
            },
          },
          '404': { description: 'Product not found' },
          '503': { description: 'Database unavailable in production environment (fail closed)' },
        },
      },
    },
    '/templates/{productId}': {
      get: {
        summary: 'Get Versioned Customisation Template',
        parameters: [
          { name: 'productId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: {
          '200': {
            description: 'Active customisation template with ordered slot definitions',
          },
          '404': { description: 'Template not found' },
          '503': { description: 'Database unavailable in production environment (fail closed)' },
        },
      },
    },
    '/pincode/{code}': {
      get: {
        summary: 'Verify Indian Pincode Delivery',
        parameters: [
          { name: 'code', in: 'path', required: true, schema: { type: 'string', pattern: '^[1-9][0-9]{5}$' } },
        ],
        responses: {
          '200': {
            description: 'Pincode delivery details and estimated transit days',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/IndianPincodeInfo' },
              },
            },
          },
        },
      },
    },
    '/quote': {
      post: {
        summary: 'Authoritative Server Price Calculation',
        description: 'Validates line items, variants, coupons, shipping rules, and returns tamper-proof calculated totals in Paisa.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/PriceQuoteRequest' },
            },
          },
        },
        responses: {
          '200': {
            description: 'Calculated authoritative price quote',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/PriceQuoteResponse' },
              },
            },
          },
          '400': { description: 'Invalid quote input or unserviceable pincode' },
          '503': { description: 'Database unavailable in production environment (fail closed)' },
        },
      },
    },
    '/checkout/create-order': {
      post: {
        summary: 'Create Pending Order (Protected Server Gate)',
        description: 'Initiates order record and prepares payment intent.',
        responses: {
          '400': { description: 'Missing required shipping or customisation values' },
          '503': { description: 'MySQL Database not connected in preview mode; orders cannot be persisted' },
        },
      },
    },
    '/admin/login': {
      post: {
        summary: 'Admin Portal Login (Scrypt + RFC 6238 TOTP)',
        description: 'Authenticates store owner. Requires username/email, strong password, and 6-digit TOTP code. Fails closed with 503 if database is unconnected.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['identifier', 'password', 'totpCode'],
                properties: {
                  identifier: { type: 'string', description: 'Store owner email or phone' },
                  password: { type: 'string', format: 'password' },
                  totpCode: { type: 'string', pattern: '^[0-9]{6}$', description: '6-digit RFC 6238 TOTP authenticator code' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Authentication successful, sets ps_admin_session cookie and returns session info' },
          '400': { description: 'Missing required credentials or MFA code' },
          '401': { description: 'Invalid credentials or TOTP authentication failed' },
          '429': { description: 'Account temporarily locked due to consecutive failed attempts' },
          '503': { description: 'Database unavailable (fail closed)' },
        },
      },
    },
    '/admin/logout': {
      post: {
        summary: 'Admin Portal Logout',
        description: 'Revokes active session from database and clears session cookie.',
        responses: {
          '200': { description: 'Session successfully revoked' },
        },
      },
    },
    '/admin/me': {
      get: {
        summary: 'Current Authenticated Owner Profile',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: {
          '200': { description: 'Returns authenticated store owner profile and session expiration' },
          '401': { description: 'Unauthorized or expired session' },
        },
      },
    },
    '/admin/metrics': {
      get: {
        summary: 'Store Owner Operational Dashboard Metrics',
        security: [{ cookieAuth: [] }, { bearerAuth: [] }],
        responses: {
          '200': { description: 'Dashboard metrics payload' },
          '401': { description: 'Unauthorized access rejected' },
          '403': { description: 'Forbidden (requires SUPERADMIN role)' },
        },
      },
    },
    '/admin/bootstrap-status': {
      get: {
        summary: 'Owner Bootstrap Status',
        description: 'Checks whether database is connected and if the single store owner has been bootstrapped.',
        responses: {
          '200': { description: 'Returns bootstrap state' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      cookieAuth: {
        type: 'apiKey',
        in: 'cookie',
        name: 'ps_admin_session',
      },
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'OpaqueHexToken',
      },
    },
    schemas: {
      HealthStatusResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['ok', 'degraded', 'error'] },
          version: { type: 'string' },
          service: { type: 'string' },
          environment: { type: 'string' },
          database: {
            type: 'object',
            properties: {
              configured: { type: 'boolean' },
              provider: { type: 'string', example: 'mysql' },
              connected: { type: 'boolean' },
              message: { type: 'string' },
              schemaStatus: { type: 'string', enum: ['applied', 'migration_pending', 'unconnected'] },
              databaseUrlMasked: { type: 'string' },
              readiness: { type: 'string', enum: ['ready', 'degraded_preview', 'unavailable'] },
            },
          },
          storage: {
            type: 'object',
            properties: {
              driver: { type: 'string', example: 'local' },
              mode: { type: 'string', example: 'temporary-preview' },
              persistent: { type: 'boolean', example: false },
              active: { type: 'boolean', example: false },
              maxUploadMb: { type: 'number', example: 15 },
              message: { type: 'string' },
            },
          },
          security: {
            type: 'object',
            properties: {
              corsConfigured: { type: 'boolean' },
              rateLimitingEnabled: { type: 'boolean' },
              mfaRequiredByPolicy: { type: 'boolean' },
              mfaOperational: { type: 'boolean' },
              mfaEnforced: { type: 'boolean' },
            },
          },
          uptimeSeconds: { type: 'number' },
          timestamp: { type: 'string', format: 'date-time' },
        },
      },
      Category: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          slug: { type: 'string' },
          name: { type: 'string' },
          shortDescription: { type: 'string' },
          icon: { type: 'string' },
          itemCount: { type: 'integer' },
        },
      },
      Product: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          sku: { type: 'string' },
          title: { type: 'string' },
          slug: { type: 'string' },
          basePricePaisa: { type: 'integer', description: 'Price in Indian Paisa (1 INR = 100 Paisa)' },
          originalMspPaisa: { type: 'integer' },
          discountPercent: { type: 'integer' },
          isPersonalised: { type: 'boolean' },
          ratingAverage: { type: 'number' },
          ratingCount: { type: 'integer' },
          stockStatus: { type: 'string' },
        },
      },
      PriceQuoteRequest: {
        type: 'object',
        required: ['items'],
        properties: {
          items: {
            type: 'array',
            items: {
              type: 'object',
              required: ['productId', 'quantity'],
              properties: {
                productId: { type: 'string' },
                variantId: { type: 'string' },
                quantity: { type: 'integer', minimum: 1, maximum: 50 },
                customisationValues: { type: 'array', items: { type: 'object' } },
              },
            },
          },
          couponCode: { type: 'string' },
          shippingPincode: { type: 'string' },
        },
      },
      PriceQuoteResponse: {
        type: 'object',
        properties: {
          subtotalPaisa: { type: 'integer' },
          variantUpgradesPaisa: { type: 'integer' },
          discountPaisa: { type: 'integer' },
          deliveryFeePaisa: { type: 'integer' },
          taxPaisa: { type: 'integer' },
          totalAmountPaisa: { type: 'integer' },
          currency: { type: 'string', example: 'INR' },
          isPincodeDeliverable: { type: 'boolean' },
        },
      },
      IndianPincodeInfo: {
        type: 'object',
        properties: {
          pincode: { type: 'string' },
          city: { type: 'string' },
          state: { type: 'string' },
          isDeliverable: { type: 'boolean' },
          standardDays: { type: 'integer' },
          expressDays: { type: 'integer' },
        },
      },
    },
  },
};
