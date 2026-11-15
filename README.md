# KiranaSaathi AI 🏪🤖

**Voice-First Stock Intelligence and Replenishment Assistant for Kirana Retailers**  
*Built for Tech4Bharat 2026 — Theme 5 (Retail, FMCG & Logistics), Problem Statement 5.1*

[![Node.js Version](https://img.shields.io/badge/Node.js-v22.14.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict_Mode-blue.svg)](https://www.typescriptlang.org/)
[![Tests](https://img.shields.io/badge/Tests-31%20Passed%20(100%25)-success.svg)](./docs/FINAL_QA_REPORT.md)
[![License: ISC](https://img.shields.io/badge/License-ISC-yellow.svg)](https://opensource.org/licenses/ISC)

---

## 1. Problem Statement & Solution

Small kirana retailers in India face distinct operating hurdles:
- **Capital tied in slow-moving or dead stock:** Retailers stock excess inventory that doesn't move while running out of fast-selling staples.
- **Stockouts on essential staples:** Unpredictable supplier lead times and lack of automated safety cover lead to lost sales.
- **No-POS operating reality:** Kiranas do not scan barcodes at checkout. Systems requiring full POS billing fail in real shops.
- **Messy records & local aliases:** Distributors and shopkeepers use colloquial regional names (*"tata namak"*, *"parle-g 5 wala"*).
- **Strict cash liquidity constraints:** Owners have a hard weekly cash replenishment budget (e.g., ₹5,000) and cannot order unconstrained EOQ volumes.
- **Customer credit (Khata):** Significant capital is trapped in informal customer credit. If counted as cash, stores suffer acute liquidity shortfalls.

**KiranaSaathi AI** is an event-sourced, no-POS-first inventory and replenishment platform engineered with:
1. **Immutable Inventory Ledger & FEFO Lots:** Auditable stock movements with zero balance tampering.
2. **No-POS Informal Workflows:** Physical shelf count snapshots, daily voice depletion notes, and distributor invoice review queues.
3. **Local Product Aliases:** Phonetic, token, and transliteration matching for Hindi and regional terms with confidence thresholds.
4. **Dead Stock Landed-Cost Valuation:** 4-bracket ageing analysis (0-30, 31-60, 61-90, 90+ days) and markdown suggestions.
5. **Hard Owner Cash Budget Replenishment:** Multi-SKU bounded knapsack allocation engine that never breaches the owner's cash cap and explains deferred items.
6. **Customer Khata & Liquidity Invariant:** Uncollected customer credit is strictly excluded from purchasing budgets.
7. **Owner-Only Approval Guardrails:** AI and helper staff can only draft purchase orders; only verified owners can approve orders.
8. **Controlled Agentic AI Orchestration:** Allowlisted domain tools only, zero direct database access, and full audit trails.
9. **Regional Festival Surge Planner:** Conservative (+25%), Moderate (+60%), and Aggressive (+120%) demand scenario modeling.
10. **Pooled Purchasing & Privacy-Preserving Demand Intelligence:** Inter-shop bulk volume discounts with independent owner liability approval.

---

## 2. Quick Start & Demonstration

### Prerequisites
- Node.js v18+ (tested on Node.js v22.14.0)
- npm v9+

### 1. Installation
```bash
git clone <repo-url>
cd KiranaSaathi-AI
npm install
```

### 2. Environment Setup
Copy the template configuration (works out of the box with zero external dependencies):
```bash
cp .env.example .env
```
*(Note: If `MONGODB_URI` is left blank, the server automatically starts a local in-memory MongoDB engine).*

### 3. Seed Realistic Kirana Demo Data
Populate the database with realistic Indian kirana staples, local aliases, near-expiry lots, khata credit accounts, and supplier quotes:
```bash
npm run seed
```

### 4. Run the Application
```bash
# Production mode:
npm run build
npm start

# OR Development mode:
npm run dev
```

Visit **`http://localhost:4000`** in your browser.

---

## 3. Automated Testing & Verification

Run the complete 15-suite automated test suite:
```bash
npm test
```

### Verified Test Suites (100% Passing):
1. `tests/integration/auth-tenancy.test.ts` — Authentication, token rotation, and multi-tenant isolation.
2. `tests/integration/inventory-ledger.test.ts` — Immutable movement ledger, opening balance, and idempotency.
3. `tests/integration/sales-receiving.test.ts` — Multi-item POS sales, FEFO lot deduction, and oversell protection.
4. `tests/integration/concurrency-race.test.ts` — High-concurrency race condition defense under 10 racing sales for 1 unit.
5. `tests/integration/purchasing-approval.test.ts` — Supplier quotes, PO lifecycle, and owner-only approval gate.
6. `tests/integration/forecasting.test.ts` — Demand estimation, near-expiry risk detection, and dead stock ageing brackets.
7. `tests/integration/product-alias.test.ts` — Local language product names, phonetic & token overlap resolution (PS-10).
8. `tests/integration/nopos-workflow.test.ts` — Shelf snapshots, voice/text depletions, and invoice review queue (PS-05 & PS-09).
9. `tests/integration/budget-replenishment.test.ts` — Hard owner cash budget cap & multi-SKU allocation (PS-12).
10. `tests/integration/khata.test.ts` — Customer credit ledger & core liquidity invariant enforcement (PS-08).
11. `tests/integration/festival.test.ts` — Festive surges (Diwali, Eid, Holi) scenario planner (PS-04).
12. `tests/integration/pooled-and-aggregate.test.ts` — Pooled purchases & privacy-preserving aggregate demand (PS-15 & PS-16).
13. `tests/integration/offline-voice.test.ts` — Offline event batch sync, idempotent replay, and voice intent parser.
14. `tests/integration/agent-tools.test.ts` — Controlled Agentic AI orchestration, domain tools, and audit traces (PS-17).
15. `tests/e2e/complete-kirana-workflow.test.ts` — Full 12-step mandatory end-to-end business lifecycle test.

---

## 4. Complete REST API Map

All endpoints are prefixed with `/api/v1`:

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `POST` | `/auth/register` | Register new user account | Public |
| `POST` | `/auth/login` | Authenticate and obtain JWT access & refresh tokens | Public |
| `POST` | `/auth/refresh` | Rotate refresh token with JTI revocation check | Authenticated |
| `GET` | `/auth/me` | Fetch user profile & shop memberships | Authenticated |
| `POST` | `/shops` | Create new shop | Authenticated |
| `GET` | `/shops/:shopId/activation-status`| 7-Day guided activation milestones status | Shop Member |
| `GET` | `/shops/:shopId/products` | Search and list products | Shop Member |
| `POST` | `/shops/:shopId/products` | Create product with optional opening balance | Owner / Manager |
| `POST` | `/shops/:shopId/products/resolve-alias` | Resolve colloquial/local product name to SKU | Shop Member |
| `POST` | `/shops/:shopId/products/:id/aliases` | Register local alias for product | Owner / Manager |
| `GET` | `/shops/:shopId/inventory` | Real-time stock overview & alert statuses | Shop Member |
| `POST` | `/shops/:shopId/inventory/receipts` | Record goods received (Idempotent) | Staff / Manager / Owner |
| `GET` | `/shops/:shopId/inventory/reconcile` | Audit ledger-to-balance consistency | Owner / Manager |
| `GET` | `/shops/:shopId/inventory/movements`| Query immutable movement ledger | Shop Member |
| `POST` | `/shops/:shopId/nopos/snapshots` | Record physical shelf count snapshot | Owner / Manager |
| `POST` | `/shops/:shopId/nopos/depletions` | Record informal daily voice/text depletion | Staff / Manager / Owner |
| `POST` | `/shops/:shopId/nopos/invoices` | Ingest supplier invoice into review queue | Owner / Manager |
| `POST` | `/shops/:shopId/nopos/invoices/:id/commit` | Commit verified invoice to inventory ledger | Owner / Manager |
| `POST` | `/shops/:shopId/sales` | Record customer sale & atomically deduct stock | Staff / Manager / Owner |
| `POST` | `/shops/:shopId/analytics/budget-replenishment` | Cash-constrained multi-SKU purchase plan | Owner / Manager |
| `GET` | `/shops/:shopId/analytics/dead-stock-analysis` | 4-bracket ageing & landed-cost dead stock | Shop Member |
| `GET` | `/shops/:shopId/analytics/reorder-recommendations`| Explainable replenishment recommendations | Shop Member |
| `GET` | `/shops/:shopId/analytics/expiry-risks` | Near-expiry lots and tied capital | Shop Member |
| `GET` | `/shops/:shopId/analytics/festival-scenarios` | Festive demand surge scenario projections | Shop Member |
| `GET` | `/shops/:shopId/analytics/aggregate-demand` | Privacy-preserving k-anonymity market demand | Shop Member |
| `GET` | `/shops/:shopId/khata/liquidity-context` | Real liquid cash vs uncollected khata | Shop Member |
| `POST` | `/shops/:shopId/khata/customers` | Open customer credit account | Owner / Manager |
| `POST` | `/shops/:shopId/khata/customers/:id/credit` | Record credit given | Staff / Manager / Owner |
| `POST` | `/shops/:shopId/khata/customers/:id/collect` | Record cash/UPI payment collection | Staff / Manager / Owner |
| `POST` | `/shops/:shopId/purchase-orders` | Create draft purchase order | Owner / Manager |
| `POST` | `/shops/:shopId/purchase-orders/:id/approve` | Approve purchase order | **Owner Only** |
| `POST` | `/shops/:shopId/purchase-orders/:id/receive` | Receive goods against purchase order | Owner / Manager |
| `POST` | `/shops/:shopId/purchase-orders/pooled/proposals` | Create pooled bulk order proposal | Owner / Manager |
| `POST` | `/shops/:shopId/agent/chat` | Send prompt to AI agent; executes domain tools | Shop Member |
| `POST` | `/shops/:shopId/sync/batch` | Ingest offline event queue with conflict detection | Authenticated Device |
| `POST` | `/shops/:shopId/voice/transcribe-intent` | Parse natural speech transcript into intent | Shop Member |

---

## 5. Project Documentation Index

- 📋 [Feature & Traceability Matrix (PS-01 to PS-18)](./docs/FEATURE_TRACEABILITY.md)
- 📊 [Implementation Status Ledger](./docs/IMPLEMENTATION_STATUS.md)
- 🧪 [Final QA Verification & Test Report](./docs/FINAL_QA_REPORT.md)
- 🔒 [Security & Tenancy Audit Review](./docs/SECURITY_REVIEW.md)
- 📋 [Requirements Specification](./docs/REQUIREMENTS.md)
- 🏗️ [System Architecture & Invariants](./docs/ARCHITECTURE.md)
- 🗄️ [Database Data Model & ERD](./docs/DATA_MODEL.md)
- 📡 [REST API Specification](./docs/API.md)
- 🛡️ [Agent Policy & Tool Registry](./docs/AGENT_POLICY.md)
- 🚀 [Competition Demonstration Runbook](./docs/DEMO_RUNBOOK.md)

---

## 6. License & Attribution

Developed for **Tech4Bharat 2026** (Theme 5: Retail, FMCG & Logistics, Problem Statement 5.1).  
Licensed under the [ISC License](https://opensource.org/licenses/ISC).
