# KiranaSaathi AI

```text
██╗  ██╗██╗██████╗  █████╗ ███╗   ██╗ █████╗ ███████╗ █████╗  █████╗ ████████╗██╗  ██╗██╗   █████╗ ██╗
██║ ██╔╝██║██╔══██╗██╔══██╗████╗  ██║██╔══██╗██╔════╝██╔══██╗██╔══██╗╚══██╔══╝██║  ██║██║  ██╔══██╗██║
█████╔╝ ██║██████╔╝███████║██╔██╗ ██║███████║███████╗███████║███████║   ██║   ███████║██║  ███████║██║
██╔═██╗ ██║██╔══██╗██╔══██║██║╚██╗██║██╔══██║╚════██║██╔══██║██╔══██║   ██║   ██╔══██║██║  ██╔══██║██║
██║  ██╗██║██║  ██║██║  ██║██║ ╚████║██║  ██║███████║██║  ██║██║  ██║   ██║   ██║  ██║██║  ██║  ██║██║
╚═╝  ╚═╝╚═╝╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝╚═╝  ╚═╝╚═╝  ╚═╝   ╚═╝   ╚═╝  ╚═╝╚═╝  ╚═╝  ╚═╝╚═╝
```

<div align="center">

### A Voice-First Replenishment Agent & Stock Intelligence for Kirana Retailers
**Official Submission for Tech4Bharat 2026 (GAVS HackCulture) — Problem Statement 5.1**

[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg)](https://opensource.org/licenses/ISC)
[![Node.js](https://img.shields.io/badge/Node.js-v22.14.0-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7_%7C_Strict-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Express](https://img.shields.io/badge/Express-4.21.2-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Architecture](https://img.shields.io/badge/Architecture-Modular_Hexagonal-blueviolet)](#-system-architecture)

[![AI Engine](https://img.shields.io/badge/AI_Engine-Gemini_1.5_Flash_%2B_Fallback-8E75C2?logo=googlegemini&logoColor=white)](#-system-architecture)
[![Database](https://img.shields.io/badge/Database-MongoDB_Atlas_8.0_%7C_In--Memory-47A248?logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Inventory Ledger](https://img.shields.io/badge/Inventory_Ledger-FEFO_Immutable-E34F26)](#-key-features)
[![Concurrency Guard](https://img.shields.io/badge/Concurrency-10--Thread_Atomic_Safe-FF6F00)](#-testing)

[![Frontend](https://img.shields.io/badge/Frontend-Mobile--First_PWA-5A67D8)](#-usage-guide)
[![Language](https://img.shields.io/badge/Vernacular-English_%2F_हिन्दी-FF9933)](#-key-features)
[![Tests](https://img.shields.io/badge/Tests-31_Passed_%7C_100%25-success?logo=vitest&logoColor=white)](./tests/)

<br>

[Live UI Showcase](#-application-screenshots) • [Problem Statement](#-problem-statement) • [Key Features](#-key-features) • [System Architecture](#-system-architecture) • [REST API Reference](#-rest-api-reference) • [Quick Start](#-quick-start) • [Testing](#-testing) • [End-to-End Workflows](#-end-to-end-workflows)

</div>

---

## 🧩 Problem Statement

India has **13 million kirana (neighbourhood grocery) stores**. Most operate without POS terminals, barcodes, or digital records. The consequences are real and measurable:

| Pain Point | Business Impact |
|---|---|
| Dead & slow-moving stock | 15–20% of working capital locked, unmonitored |
| Expiry write-offs | ₹5,000–₹10,000/month lost silently |
| Stockouts on fast-selling staples | Lost sales, customer attrition |
| No POS billing | Existing inventory tools don't fit the workflow |
| Colloquial product names | *"Peela wala tel"*, *"Cheeni moti wali"* — no ERP understands them |
| Khata credit miscounted as cash | Acute liquidity shortfalls when purchasing |

**KiranaSaathi AI** is not another dashboard bolted onto retail infrastructure that doesn't exist. It is built from the ground up around *how kiranas actually work* — spoken inputs, supplier invoices, shelf counts, and Hindi/Hinglish everything.

---

## 🖥️ Application Screenshots

> The application runs locally at `http://localhost:4000`. The screenshots below show the genuine running UI components captured from the application.

### 1. Store Overview & KPI Dashboard
![Store Dashboard](assets/screenshots/dashboard.png)
*Real-time store overview showing the 7-Day Guided Activation roadmap (PS-11), key operational KPIs (Total Products, Low Stock Alerts, Near-Expiry Lots, Safe Cash Buffer), and the top header with dual Dark/Light and English/हिन्दी toggle switches.*

### 2. Multi-Role Authentication & Quick Switcher Modal
![Header Auth Switcher](assets/screenshots/header_auth_modal.png)
*Interactive header auth modal allowing instant switching between Owner (`murugan.owner@kirana.in`), Manager (`manager@kirana.in`), and Staff (`staff@kirana.in`) roles, as well as new user registration and store profile management.*

### 3. Grounded Reorder Recommendations & Demand Velocity
![Reorder Recommendations](assets/screenshots/reorder_rec.png)
*Deterministic reorder recommendation engine showing on-hand stock, average daily demand velocity, days of cover left, suggested reorder quantities, and data quality indicators.*

### 4. Product Catalogue & Real-Time Stock Management
![Product Catalogue](assets/screenshots/product_added.png)
*Product inventory catalogue with search filtering, on-hand stock status, reorder thresholds, ledger reconciliation triggers, and modal for adding products with opening stock balances.*

### 5. POS Billing & Atomic FEFO Stock Deductions
![POS Billing](assets/screenshots/pos_sale.png)
*POS billing interface with cash/UPI/credit payment modes, atomic stock verification, and automatic First-Expired-First-Out (FEFO) lot consumption.*

### 6. AI Voice & Replenishment Assistant
![AI Voice Assistant](assets/screenshots/ai_assistant.png)
*Conversational AI assistant supporting English, Hindi, and Hinglish queries with explainable stock guidance, budget-constrained allocations, and structured tool execution audit logs.*

---

## ✨ Key Features

### ✅ Implemented & Verified

| Feature | What It Does | Verification |
|---|---|---|
| **No-POS Stock Intelligence** | Accepts supplier invoices, shelf snapshots, voice/text depletion notes, khata records — without requiring POS billing | `nopos-workflow.test.ts` |
| **Colloquial Product Alias Engine** | 4-stage resolution: exact alias → exact product → token overlap (Jaccard) → Levenshtein fuzzy. Supports Devanagari Unicode | `product-alias.test.ts` |
| **Immutable Inventory Ledger** | Append-only movement records; atomic stock balance updates; idempotency keys prevent duplicate entries | `inventory-ledger.test.ts` |
| **FEFO Lot Tracking** | First-Expired-First-Out batch deduction; near-expiry alerts within configurable horizon | `inventory-ledger.test.ts` |
| **Concurrency Race Defense** | 10 simultaneous sale requests for 1 unit — only 1 succeeds; 9 receive `HTTP 409 Insufficient Stock` | `concurrency-race.test.ts` |
| **Hard Cash Budget Allocation** | Owner sets weekly ₹ cap; greedy knapsack ranks SKUs by urgency × velocity × margin; deferred items explained | `budget-replenishment.test.ts` |
| **Khata Liquidity Invariant** | Uncollected receivables excluded from purchase budgets; collection-probability discounting applied | `khata.test.ts` |
| **Owner-Only Approval Gate** | PO approval enforced at API + service + DB level; manager/staff get `403`; any edit reverts to draft | `purchasing-approval.test.ts` |
| **Governed Agentic AI** | ReAct orchestrator with 11 allowlisted tools; Zod-validated params; role-gated tools; full audit trail | `agent-tools.test.ts` |
| **Festival Surge Planner** | Conservative (+25%) / Moderate (+60%) / Aggressive (+120%) demand scenarios for 4 Indian festivals | `festival.test.ts` |
| **Offline Event Sync** | Offline event queue with idempotent replay, conflict detection, and timestamp-ordering | `offline-voice.test.ts` |
| **Pooled Purchasing** | Multi-shop bulk volume proposals; independent owner liability approval; k-anonymity aggregate demand | `pooled-and-aggregate.test.ts` |
| **7-Day Guided Activation** | 5-milestone onboarding roadmap; tracks product setup, shelf snapshot, invoice ingestion, depletion logging, first PO | `shops/activation.service.ts` |
| **Dark/Light Theme Toggle** | Persistent CSS-variable-based dark mode; localStorage state | `public/js/app.js` |
| **English/हिन्दी Toggle** | Full i18n dictionary; all navigation labels switch on toggle | `public/js/app.js` |
| **Multi-Role Auth Switcher** | Quick Switch modal for Owner / Manager / Staff demo personas | `public/index.html` |

### 🔮 Planned / Not Yet Implemented

- Real barcode scanner integration (camera-based)
- WhatsApp Business API for voice note ingestion
- Offline-first PWA with service worker caching
- Automated distributor visit scheduling

---

## 🛠️ Technology Stack

| Technology | Role | Where Used |
|---|---|---|
| **Node.js v22** | JavaScript runtime | `src/server.ts` |
| **TypeScript 5.7** (Strict) | Type-safe backend | All `src/**/*.ts` |
| **Express 4** | HTTP framework, REST API | `src/app.ts` |
| **MongoDB + Mongoose 8** | Primary datastore, ODM | `src/config/database.ts`, all models |
| **mongodb-memory-server** | Zero-dependency in-memory DB for dev/test | `src/config/database.ts` |
| **bcryptjs** | Password hashing | `src/common/utils/crypto.ts` |
| **jsonwebtoken** | JWT access + refresh tokens | `src/modules/auth/auth.service.ts` |
| **Zod 3** | Runtime schema validation, agent tool params | All schemas + agent tools |
| **Vitest** | Test framework (unit + integration + E2E) | `vitest.config.ts`, `tests/**` |
| **supertest** | HTTP integration test client | All `*.test.ts` files |
| **uuid** | Idempotency keys, reference IDs | `src/modules/sync/` |
| **tsx** | TypeScript execution (dev), seed scripts | `package.json` dev scripts |
| **Gemini API** *(optional)* | LLM intent detection; falls back to deterministic engine | `src/modules/agent/provider.adapter.ts` |
| **Vanilla JS PWA** | Lightweight, mobile-first frontend; no framework dependency | `public/index.html`, `public/js/app.js` |
| **CSS Variables** | Dark mode theming system | `public/css/styles.css` |

---

## 🏗️ System Architecture

### Component Overview

```mermaid
flowchart TD
    UI["🖥️ Browser PWA\n(public/index.html + app.js)"]
    API["⚙️ Express REST API\n(src/app.ts — /api/v1)"]
    AUTH["🔒 Auth Module\nJWT + bcrypt\nAccess + Refresh Tokens"]
    AGENT["🤖 Agent Module\nReAct Orchestrator\n11 Allowlisted Tools"]
    PROVIDER["🧠 AI Provider Adapter\nGemini API → deterministic fallback"]
    TOOLS["🔧 Agent Tool Registry\nZod-validated, Role-gated"]
    INVENTORY["📦 Inventory Module\nImmutable Ledger\nFEFO Lots"]
    ANALYTICS["📊 Analytics Module\nForecasting, Budget,\nFestival, Dead Stock"]
    NOPOS["📋 No-POS Module\nInvoice Queue,\nShelf Snapshots,\nVoice Depletions"]
    KHATA["📒 Khata Module\nCustomer Credit\nLiquidity Context"]
    PRODUCTS["🏷️ Products + Aliases\nColloquial Name\nResolution Engine"]
    PURCHASING["📑 Purchasing Module\nPO Lifecycle\nOwner Approval Gate"]
    SYNC["📡 Sync Module\nOffline Event Queue\nIdempotent Replay"]
    VOICE["🎙️ Voice Module\nHinglish Intent Parser"]
    MONGO[("🗄️ MongoDB\nin-memory or Atlas")]

    UI -->|REST / JSON| API
    API --> AUTH
    API --> AGENT
    API --> INVENTORY
    API --> ANALYTICS
    API --> NOPOS
    API --> KHATA
    API --> PRODUCTS
    API --> PURCHASING
    API --> SYNC
    API --> VOICE

    AGENT --> PROVIDER
    PROVIDER --> TOOLS
    TOOLS --> INVENTORY
    TOOLS --> ANALYTICS
    TOOLS --> KHATA
    TOOLS --> PRODUCTS
    TOOLS --> PURCHASING

    INVENTORY --> MONGO
    ANALYTICS --> MONGO
    NOPOS --> MONGO
    KHATA --> MONGO
    PRODUCTS --> MONGO
    PURCHASING --> MONGO
    SYNC --> MONGO
    AUTH --> MONGO
```

### Security & Multi-Tenancy Model

```mermaid
flowchart LR
    REQ["Incoming Request"] --> MW["JWT Middleware\nVerify + Decode Token"]
    MW --> TENANT["Tenant Isolation\nAll queries scoped to shopId"]
    TENANT --> RBAC["Role Check\nOwner / Manager / Staff"]
    RBAC -->|Owner| FULL["Full Access"]
    RBAC -->|Manager| MAN["Read + Write\nNo PO Approval"]
    RBAC -->|Staff| STAFF["Read + Record\nSales / Depletions"]
    RBAC -->|Agent| AGENT_GATE["Agent Tools\nRole-Gated per Tool\nNo direct DB access\nNo expenditure commitment"]
```

---

## 📋 Repository Structure

```
KiranaSaathi-AI/
├── src/                          # TypeScript backend source
│   ├── app.ts                    # Express app factory, route mounting
│   ├── server.ts                 # HTTP server bootstrap
│   ├── config/
│   │   ├── database.ts           # MongoDB connect (Atlas or in-memory)
│   │   ├── env.ts                # Zod-validated environment config
│   │   └── logger.ts             # Structured logger
│   ├── common/
│   │   ├── errors/               # AppError class + error codes
│   │   ├── middleware/           # JWT auth, request ID, error handler
│   │   ├── models/               # Shared types
│   │   └── utils/                # Crypto, helpers
│   └── modules/
│       ├── agent/                # ReAct orchestrator, tool registry, provider adapter
│       ├── analytics/            # Budget allocation, forecasting, festival, aggregate demand
│       ├── auth/                 # Register, login, token refresh, /me
│       ├── health/               # /health/live liveness probe
│       ├── inventory/            # Immutable ledger, FEFO lots, stock balances
│       ├── khata/                # Customer credit, liquidity context
│       ├── nopos/                # Invoice queue, shelf snapshots, voice depletions
│       ├── products/             # Product CRUD, alias resolution engine
│       ├── purchasing/           # PO lifecycle, pooled purchasing
│       ├── sales/                # Atomic FEFO sales with oversell guard
│       ├── shops/                # Shop CRUD, 7-day activation milestones
│       ├── suppliers/            # Supplier directory, quote comparison
│       ├── sync/                 # Offline event batch sync, idempotency
│       └── voice/                # Hinglish intent parser
├── tests/
│   ├── e2e/
│   │   └── complete-kirana-workflow.test.ts   # 12-step full lifecycle E2E
│   ├── integration/              # 14 focused integration test suites
│   └── helpers/setup.ts          # Test DB bootstrap
├── public/                       # Static PWA frontend
│   ├── index.html                # Full SPA — 13 views, all modals, auth
│   ├── js/app.js                 # App logic: auth, theming, i18n, all API calls
│   └── css/styles.css            # Dark mode tokens, responsive layout
├── scripts/
│   └── seed-demo-data.ts         # Full demo dataset: products, aliases, khata, POs
├── assets/screenshots/           # Verified application UI screenshots
├── .env.example                  # Safe environment template
├── package.json                  # Scripts: dev, build, start, test, seed
├── tsconfig.json                 # Strict TypeScript config
└── vitest.config.ts              # Test configuration
```

---

## ✅ Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | v18+ (tested on v22.14.0) | [nodejs.org](https://nodejs.org) |
| npm | v9+ | Bundled with Node.js |
| MongoDB | Optional | Auto-starts in-memory if `MONGODB_URI` is blank |
| Gemini API Key | Optional | Deterministic engine used if absent |

No Docker, no external infrastructure required for local development.

---

## 🚀 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/rajat552/KiranaSaathi-AI.git
cd KiranaSaathi-AI
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

The defaults in `.env.example` work immediately — in-memory MongoDB starts automatically. No external services needed.

### 3. Start the Server

```bash
# Development (hot-reload):
npm run dev

# OR Production build:
npm run build
npm start
```

Server starts at **`http://localhost:4000`**

### 4. Seed Demo Data *(Optional but Recommended)*

Populates the database with realistic Indian kirana data — staple products, local aliases, near-expiry batches, khata customers, supplier quotes, and demo purchase orders:

```bash
npm run seed
```

> **Note:** The in-memory database resets on each server restart. Run `npm run seed` again after any restart.

### 5. Demo Login Credentials

| Role | Email | Password |
|---|---|---|
| **Owner** (full access) | `murugan.owner@kirana.in` | `KiranaPassword2026!` |
| **Manager** | `manager@kirana.in` | `KiranaPassword2026!` |
| **Staff** | `staff@kirana.in` | `KiranaPassword2026!` |

---

## ⚙️ Environment Variables

| Variable | Purpose | Required | Default / Example |
|---|---|---|---|
| `PORT` | HTTP server port | No | `4000` |
| `NODE_ENV` | Runtime environment | No | `development` |
| `API_PREFIX` | Base URL prefix for all routes | No | `/api/v1` |
| `MONGODB_URI` | MongoDB connection string | No | *(blank → in-memory DB)* |
| `USE_MEMORY_DB` | Force in-memory MongoDB | No | `true` |
| `JWT_ACCESS_SECRET` | Access token signing secret | **Yes (prod)** | `kiranasaathi_..._demo` |
| `JWT_REFRESH_SECRET` | Refresh token signing secret | **Yes (prod)** | `kiranasaathi_..._demo` |
| `JWT_ACCESS_EXPIRY` | Access token lifetime | No | `15m` |
| `JWT_REFRESH_EXPIRY` | Refresh token lifetime | No | `7d` |
| `CORS_ORIGIN` | Allowed CORS origin | No | `*` |
| `GEMINI_API_KEY` | Gemini API for LLM intent detection | No | *(blank → deterministic fallback)* |
| `LYZR_API_KEY` | Alternative AI provider | No | *(unused if Gemini set)* |

> ⚠️ **Never commit real `JWT_ACCESS_SECRET` or `JWT_REFRESH_SECRET` values to source control.**

---

## 📖 Usage Guide

### Dashboard
- **KPI Cards:** Total products, low-stock count, near-expiry lots, safe cash buffer
- **7-Day Activation Milestones:** Tracks your onboarding progress (catalogue → snapshot → invoices → depletions → first PO)
- **Operational Alerts:** Dead stock highlights and urgent reorder signals

### No-POS Operations
1. **Voice/Text Depletion:** Type *"5 cheeni packet beche"* or *"8 parle-g sold"* — the system resolves the alias and logs it
2. **Shelf Snapshot:** Record a physical shelf count; the engine computes variance vs ledger
3. **Supplier Invoice Queue:** Ingest a bill; review line items; commit to inventory ledger after verification

### Cash Budget Planner
1. Enter your weekly cash cap (e.g., ₹5,000)
2. Click **Run Bounded Allocation**
3. See which SKUs are fully allocated, partially allocated, or deferred — with plain-language rationale for each

### AI Voice Assistant
Type or speak any of:
```
"What should I reorder today?"
"Analyze my dead stock"
"Plan replenishment under cash budget 8000"
"How much is in customer khata?"
"Show Diwali demand surge scenarios"
"Check expiry risks"
```

The agent routes your query to the appropriate backend tool, executes it, formats a human-readable response, and logs the full tool call trace.

### Khata & Liquidity
- Add customer credit accounts
- Record credit given and cash/UPI collections
- View **Safe Reorder Budget Cap** = liquid cash − collection-probability-discounted receivables

### Purchase Orders
1. Create a draft PO (AI or manual)
2. Only the **Owner** can approve — Manager/Staff receive `HTTP 403`
3. Any edit to an approved order automatically reverts it to `DRAFT`
4. Receive goods to update inventory

---

## 🔌 REST API Reference

All endpoints are prefixed with `/api/v1`:

### Authentication

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/auth/register` | Register new user | Public |
| `POST` | `/auth/login` | Login, receive JWT access + refresh tokens | Public |
| `POST` | `/auth/refresh` | Rotate refresh token (JTI revocation) | Public |
| `GET` | `/auth/me` | Get user profile + shop memberships | Bearer |

### Shops

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/shops` | Create a shop | Bearer |
| `GET` | `/shops/:shopId/activation-status` | 7-day activation milestones | Member |

### Products & Aliases

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/shops/:shopId/products` | List/search products | Member |
| `POST` | `/shops/:shopId/products` | Create product + opening balance | Owner/Manager |
| `POST` | `/shops/:shopId/products/resolve-alias` | Resolve colloquial name → canonical SKU | Member |
| `POST` | `/shops/:shopId/products/:id/aliases` | Register local alias | Owner/Manager |

### Inventory

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/shops/:shopId/inventory` | Real-time stock overview + alert statuses | Member |
| `POST` | `/shops/:shopId/inventory/receipts` | Record goods received (idempotent) | Staff+ |
| `GET` | `/shops/:shopId/inventory/movements` | Query immutable movement ledger | Member |
| `GET` | `/shops/:shopId/inventory/reconcile` | Audit ledger consistency | Owner/Manager |

### No-POS Operations

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/shops/:shopId/nopos/snapshots` | Record shelf count snapshot | Owner/Manager |
| `POST` | `/shops/:shopId/nopos/depletions` | Record voice/text depletion observation | Staff+ |
| `POST` | `/shops/:shopId/nopos/invoices` | Ingest supplier invoice into review queue | Owner/Manager |
| `POST` | `/shops/:shopId/nopos/invoices/:id/commit` | Commit verified invoice to ledger | Owner/Manager |

### Sales

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/shops/:shopId/sales` | Record sale + atomic FEFO stock deduction | Staff+ |

### Analytics

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/shops/:shopId/analytics/budget-replenishment` | Cash-constrained multi-SKU purchase plan | Owner/Manager |
| `GET` | `/shops/:shopId/analytics/dead-stock-analysis` | 4-bracket ageing + landed-cost analysis | Member |
| `GET` | `/shops/:shopId/analytics/reorder-recommendations` | Explainable replenishment suggestions | Member |
| `GET` | `/shops/:shopId/analytics/expiry-risks` | Near-expiry lots and tied capital | Member |
| `GET` | `/shops/:shopId/analytics/festival-scenarios` | Festival demand surge projections | Member |
| `GET` | `/shops/:shopId/analytics/aggregate-demand` | Privacy-preserving k-anonymity market demand | Member |

### Khata (Customer Credit)

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `GET` | `/shops/:shopId/khata/liquidity-context` | Real liquid cash vs uncollected khata | Member |
| `POST` | `/shops/:shopId/khata/customers` | Open customer credit account | Owner/Manager |
| `POST` | `/shops/:shopId/khata/customers/:id/credit` | Record credit given | Staff+ |
| `POST` | `/shops/:shopId/khata/customers/:id/collect` | Record cash/UPI collection | Staff+ |

### Purchasing

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/shops/:shopId/purchase-orders` | Create draft PO | Owner/Manager |
| `POST` | `/shops/:shopId/purchase-orders/:id/approve` | **Approve PO** | **Owner Only** |
| `POST` | `/shops/:shopId/purchase-orders/:id/receive` | Receive goods against approved PO | Owner/Manager |
| `POST` | `/shops/:shopId/purchase-orders/pooled/proposals` | Create pooled bulk order proposal | Owner/Manager |

### AI Agent, Voice & Sync

| Method | Endpoint | Description | Auth |
|---|---|---|---|
| `POST` | `/shops/:shopId/agent/chat` | Send prompt to AI agent | Member |
| `POST` | `/shops/:shopId/voice/transcribe-intent` | Parse Hinglish speech to structured intent | Member |
| `POST` | `/shops/:shopId/sync/batch` | Ingest offline event queue | Authenticated Device |
| `GET` | `/api/v1/health/live` | Liveness probe | Public |

---

## 🧪 Testing

### Run All Tests

```bash
npm test
```

### Test Suites (15 total — 31 tests — 100% passing)

| # | Suite | What It Verifies |
|---|---|---|
| 1 | `auth-tenancy.test.ts` | Registration, login, token rotation, multi-tenant data isolation |
| 2 | `inventory-ledger.test.ts` | Immutable movement ledger, opening balance, idempotency |
| 3 | `sales-receiving.test.ts` | Multi-item sales, FEFO lot deduction, oversell protection |
| 4 | `concurrency-race.test.ts` | **10 concurrent threads competing for 1 unit** — only 1 succeeds |
| 5 | `purchasing-approval.test.ts` | Supplier quotes, PO lifecycle, owner-only approval enforcement |
| 6 | `forecasting.test.ts` | Demand estimation, near-expiry detection, dead stock ageing |
| 7 | `product-alias.test.ts` | Hinglish/regional alias resolution, phonetic + fuzzy matching |
| 8 | `nopos-workflow.test.ts` | Shelf snapshots, voice depletions, invoice review queue |
| 9 | `budget-replenishment.test.ts` | Hard cash budget cap, multi-SKU greedy allocation |
| 10 | `khata.test.ts` | Customer credit ledger, liquidity invariant enforcement |
| 11 | `festival.test.ts` | Diwali/Eid/Holi/Pongal surge scenario projections |
| 12 | `pooled-and-aggregate.test.ts` | Pooled purchases, k-anonymity aggregate demand |
| 13 | `offline-voice.test.ts` | Offline event batch sync, idempotent replay, voice intent parser |
| 14 | `agent-tools.test.ts` | Agentic AI orchestration, tool registry, role gates, audit traces |
| 15 | `complete-kirana-workflow.test.ts` | **Full 12-step end-to-end business lifecycle** |

```bash
# Run with coverage report:
npm run test:coverage

# Watch mode for development:
npm run test:watch
```

---

## 🔄 End-to-End Workflows

### Document Ingestion: Supplier Invoice → Inventory Ledger

```mermaid
sequenceDiagram
    participant Owner
    participant UI as Frontend PWA
    participant API as /nopos/invoices
    participant DB as MongoDB

    Owner->>UI: Submit supplier invoice (invoice #, description, qty, cost)
    UI->>API: POST /nopos/invoices
    API->>DB: Save invoice → status: PENDING_REVIEW
    API-->>UI: Invoice queued for review

    Owner->>UI: Review invoice lines, verify product aliases
    UI->>API: POST /nopos/invoices/:id/commit
    API->>DB: Resolve aliases → record inventory RECEIPT movement
    API->>DB: Update StockBalance atomically
    API->>DB: Create FEFO lot (if expiry date provided)
    API-->>UI: Stock updated ✓
```

### AI Agent Query Workflow

```mermaid
sequenceDiagram
    participant User
    participant UI as PWA Chat
    participant Agent as Agent Service
    participant Provider as AI Provider Adapter
    participant Tool as Tool Registry
    participant DB as MongoDB

    User->>UI: "Plan replenishment with 5000 budget"
    UI->>Agent: POST /agent/chat {prompt}
    Agent->>Provider: processPrompt(context, prompt, tools)
    Provider->>Provider: Gemini API (or deterministic fallback)
    Provider-->>Agent: {toolName: 'get_cash_budget_plan', toolArgs: {budgetLimit: 5000}}
    Agent->>Tool: Validate role + Zod params
    Tool->>DB: Fetch stock, demand forecasts, product costs
    Tool-->>Agent: BudgetReplenishmentPlan
    Agent->>Agent: Format human-readable response
    Agent->>DB: Save AgentRun audit record
    Agent-->>UI: Formatted response + toolCallsTrace
    UI-->>User: "💵 Allocated ₹4,850 across 8 SKUs (97%). 2 items deferred..."
```

### Replenishment Purchase Order Lifecycle

```mermaid
flowchart LR
    DRAFT["DRAFT\n(AI or Manual)"]
    APPROVED["APPROVED\n(Owner Only)"]
    RECEIVED["RECEIVED\n(Goods Arrived)"]
    CANCELLED["CANCELLED"]

    DRAFT -->|Owner approves| APPROVED
    DRAFT -->|Cancel| CANCELLED
    APPROVED -->|Any edit| DRAFT
    APPROVED -->|Goods received| RECEIVED

    style APPROVED fill:#d1fae5,stroke:#059669
    style CANCELLED fill:#fee2e2,stroke:#dc2626
```

---

## 🔧 Troubleshooting

| Symptom | Likely Cause | Fix |
|---|---|---|
| `Cannot connect to MongoDB` | MONGODB_URI incorrect or Atlas unreachable | Leave `MONGODB_URI` blank to use in-memory DB |
| `Login returns 401` | In-memory DB reset after server restart | Run `npm run seed` again after restarting |
| `Tests fail with timeout` | Vitest hitting the 60s default | In-memory DB sometimes slow on first run; retry `npm test` |
| `PO approve returns 403` | Logged in as Manager or Staff | Switch to Owner role; only Owners can approve |
| `Alias resolution returns 'none'` | Product not in catalogue yet | Add the product first via Products view |
| `Port 4000 already in use` | Previous dev server still running | `kill -9 $(lsof -t -i:4000)` or change `PORT` in `.env` |
| `Gemini API not responding` | Missing or invalid `GEMINI_API_KEY` | Normal — deterministic engine activates automatically |

---

## 🚢 Deployment

### Local Production Build

```bash
npm run build        # Compiles TypeScript → dist/
npm start            # Runs dist/server.js
```

### Environment for Production

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/kiranasaathi
USE_MEMORY_DB=false
JWT_ACCESS_SECRET=<64-char random secret>
JWT_REFRESH_SECRET=<64-char random secret>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
CORS_ORIGIN=https://your-frontend-domain.com
GEMINI_API_KEY=<your Gemini API key>
```

### Railway / Render / Fly.io

1. Connect your GitHub repo
2. Set `npm run build` as the build command
3. Set `npm start` as the start command
4. Add all production environment variables
5. Set `PORT` to whatever the platform provides (Express reads `process.env.PORT`)

> The app serves both the REST API and the static frontend from a single process — no separate frontend deployment needed.

---

## 📊 Project Status

### ✅ Completed (Hackathon Submission State)

- 15/15 test suites, 31/31 tests passing
- Full REST API (40+ endpoints)
- Complete PWA frontend (13 views, 10+ modals)
- Governed Agentic AI with Gemini + deterministic fallback
- 5-tier product alias resolution (Hinglish/Devanagari support)
- Concurrency-safe inventory with FEFO
- Hard cash budget allocation (bounded greedy knapsack)
- Khata liquidity invariant
- Festival demand planning (4 festivals × 3 scenarios)
- Pooled purchasing + k-anonymity aggregate demand
- Offline event sync with idempotent replay
- 7-day guided onboarding activation
- Dark mode + English/Hindi language toggle

### 🔮 Roadmap

- [ ] Real barcode scanner via browser camera API
- [ ] WhatsApp Business webhook for voice note ingestion
- [ ] PWA service worker + IndexedDB offline-first
- [ ] Automated distributor visit scheduling
- [ ] SMS/OTP owner approval flow
- [ ] Multi-language support (Tamil, Telugu, Marathi)

---

## 🤝 Contributing

This project was built for **GAVS HackCulture — Tech4Bharat 2026**. 

To run a fresh development environment:

```bash
git clone https://github.com/rajat552/KiranaSaathi-AI.git
cd KiranaSaathi-AI
npm install
cp .env.example .env
npm run dev        # Start server
npm run seed       # Seed demo data (new terminal)
npm test           # Verify all 31 tests pass
```

---

## 📄 License & Acknowledgements

Licensed under the [ISC License](https://opensource.org/licenses/ISC).

Built for **GAVS HackCulture — Tech4Bharat 2026**  
Theme 5: Retail, FMCG & Logistics | Problem Statement 5.1  
*Kiranas tie up cash in dead stock while running out of fast-moving essentials*

**GitHub:** [github.com/rajat552/KiranaSaathi-AI](https://github.com/rajat552/KiranaSaathi-AI)
