# Indian Personalised Products E-Commerce Platform — Phase 1 Architecture & Deployment Guide

## 1. Executive Architecture Summary
- **Model**: Single-Owner Commercial Store (Never a multi-vendor marketplace; no seller commissions or third-party portals).
- **Core Stack**: Node.js 22 LTS, TypeScript 5+, Express 4.x (`/api/v1`), MySQL 8.0+, Prisma ORM 6.x.
- **Frontend**: High-density Flipkart-inspired UI with royal indigo (`#172554` / `#1e1b4b`) and warm amber (`#d97706`) accents, zero-pill discipline, responsive phone/desktop layouts, and real-time customisation preview studio.
- **Security Posture**: Server-authoritative tamper-proof pricing in Indian Paisa, input sanitization, sliding-window rate limiting, restrictive CORS & security headers, PII scrubbing in logs, admin MFA requirement.
- **Current Preview State**: Phase 1 Architecture Foundation. When `DATABASE_URL` is unconnected, the app operates in an explicit **Development Fixtures Mode** with clear UI/API banners; data persistence is never faked.

---

## 2. Project Directory Structure
```
├── /docs
│   └── openapi.yaml                 # OpenAPI 3.1 specification for Web & Android
├── /prisma
│   ├── schema.prisma                # Relational MySQL 8 Prisma schema (20 models)
│   └── migrations
│       └── 0_init
│           └── migration.sql        # Pure MySQL 8 DDL initial migration script
├── /server
│   ├── db.ts                        # MySQL connection manager & honest health reporting
│   ├── openapi.ts                   # Programmatic OpenAPI 3.1 definition
│   ├── routes
│   │   └── api.ts                   # Express REST API v1 endpoints
│   └── security.ts                  # Security headers, rate limiting, quote engine, PII scrubbing
├── /shared
│   ├── fixtures.ts                  # Synthetic development fixtures (clearly tagged)
│   └── types.ts                     # Shared TypeScript contracts & domain models
├── /src
│   ├── components
│   │   ├── AdminShell.tsx           # Admin portal design shell & security gate
│   │   ├── CartDrawer.tsx           # Slide-over cart with live quote validation
│   │   ├── Footer.tsx               # Indian e-commerce footer & payment trust marks
│   │   ├── Header.tsx               # Utility strip, search, pincode estimator, category bar
│   │   ├── HeroBanner.tsx           # High-conversion promo carousel
│   │   ├── LiveCustomiserModal.tsx  # Real-time customisation studio (text & photo preview)
│   │   ├── MobileBottomNav.tsx      # Mobile 5-tab quick navigation
│   │   ├── OfferStrip.tsx           # Compact deal tiles
│   │   ├── PincodeModal.tsx         # Indian pincode delivery checker modal
│   │   ├── ProductCard.tsx          # Flipkart-inspired compact product card
│   │   └── ProductDetailView.tsx    # Complete product detail skeleton & customisation specs
│   ├── App.tsx                      # Main routed view container with state management
│   ├── index.css                    # Tailwind CSS v4 setup
│   └── main.tsx                     # React 19 client mount
├── /tests
│   └── api-verification.ts          # Automated test suite (pricing defense, health, security)
├── .env.example                     # Environment template without secrets
├── package.json                     # Scripts & full-stack dependencies
├── server.ts                        # Full-stack Express server mounting Vite in dev
└── tsconfig.json                    # Strict TypeScript configuration
```

---

## 3. Local MySQL 8 Setup Instructions

### Option A: Using Docker (Fastest)
```bash
docker run --name personalised-mysql \
  -e MYSQL_ROOT_PASSWORD=root_secret \
  -e MYSQL_DATABASE=personalised_store_db \
  -e MYSQL_USER=store_admin \
  -e MYSQL_PASSWORD=secure_password_here \
  -p 3306:3306 -d mysql:8.0
```

### Option B: Local MySQL 8 Installation (Linux/macOS/Windows)
1. Install MySQL 8:
   - Ubuntu/Debian: `sudo apt update && sudo apt install mysql-server`
   - macOS: `brew install mysql`
2. Create database and dedicated user:
```sql
CREATE DATABASE personalised_store_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'store_admin'@'%' IDENTIFIED BY 'secure_password_here';
GRANT ALL PRIVILEGES ON personalised_store_db.* TO 'store_admin'@'%';
FLUSH PRIVILEGES;
```

---

## 4. Prisma Migrations & Generation Commands
1. Copy `.env.example` to `.env` and insert your MySQL credentials:
   ```env
   DATABASE_URL="mysql://store_admin:secure_password_here@localhost:3306/personalised_store_db?connect_timeout=5"
   ```
2. Generate Prisma Client:
   ```bash
   npx prisma generate
   ```
3. Deploy the migration to create all tables and indexes:
   ```bash
   npx prisma migrate deploy
   ```
   Or manually load the DDL:
   ```bash
   mysql -u store_admin -p personalised_store_db < prisma/migrations/0_init/migration.sql
   ```

---

## 5. Development & Testing Commands
```bash
# Start Full-Stack Dev Server (Express API + Vite Frontend on port 3000)
npm run dev

# Run Automated Verification Tests (Pricing tamper-proofing, health, input validation)
npm run test:api

# Type-check TypeScript codebase
npm run lint

# Build production assets
npm run build

# Start production server
npm run start
```

---

## 6. Deployment Prerequisites

### A. Node-Capable Shared Hosting (e.g. cPanel with Phusion Passenger / CloudLinux)
- **Node.js Selector**: Set Node.js version to `22.x`.
- **Application Startup File**: `server.ts` (or compile `server.ts` to `dist/server.js` using `esbuild`).
- **Environment Variables**: Configure `DATABASE_URL`, `NODE_ENV=production`, `PORT=3000`, `JWT_SECRET` via the cPanel Node.js Application Manager.
- **MySQL Database**: Use the cPanel MySQL Database Wizard to create the database and assign the user. Run `npx prisma migrate deploy`.

### B. Linux VPS (Ubuntu 22.04 / 24.04 with Nginx + PM2)
1. Install Node 22:
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
   sudo apt install -y nodejs
   ```
2. Run PM2 process manager:
   ```bash
   npm run build
   pm2 start server.ts --name "personalised-store" --interpreter "tsx"
   pm2 save && pm2 startup
   ```
3. Nginx Reverse Proxy with SSL (Certbot):
   ```nginx
   server {
       server_name yourstore.in www.yourstore.in;
       location / {
           proxy_pass http://127.0.0.1:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

---

## 7. Planned Native Android Kotlin + Jetpack Compose Consumer
The REST API v1 (`/api/v1`) is strictly versioned and designed to serve the upcoming native Android application:
1. **Catalog & Discovery**: Consumes `GET /api/v1/catalog/categories` and `GET /api/v1/catalog/products` via Retrofit + Kotlinx Serialization.
2. **Template Customisation**: Consumes `GET /api/v1/templates/{productId}` to dynamically render text fields, photo pickers (using Android Photo Picker API), and aspect-ratio crop boxes.
3. **Authoritative Cart & Quote**: Posts to `POST /api/v1/quote` on cart modifications, displaying server-calculated totals, Indian Pincode delivery estimates, and GST breakdowns.
4. **Image Uploads**: Multi-part upload to private storage endpoint with client-side thumbnail generation.

---

## 8. Honest Status & Phase Roadmap

| Feature / Domain | Phase 1 Status | Phase 2 Production Requirement |
| :--- | :--- | :--- |
| **Catalog UI & Navigation** | ✅ Working Desktop & Mobile | Live MySQL database records |
| **Real-time Customiser** | ✅ Interactive Visual Studio | Server-side SVG/Canvas high-res rendering |
| **Tamper-proof Pricing** | ✅ Tested Server Authoritative | Active Razorpay / Cashfree webhook integration |
| **Pincode Delivery Check** | ✅ Working Indian PIN database | Live Courier API (Delhivery / BlueDart) |
| **Prisma Relational Schema** | ✅ Generated & Migrated DDL | Production MySQL 8 instance connected |
| **Cart & Quote Calculation** | ✅ Real-time calculation | Redis session caching for high traffic |
| **Admin Dashboard** | ✅ Security Shell & KPI Preview | Live JWT + MFA staff authentication |
| **SEO & SSR** | ⚠️ React SPA in Dev Preview | **SSR / Prerendering (Next.js App Router)** required for production crawler indexing |
