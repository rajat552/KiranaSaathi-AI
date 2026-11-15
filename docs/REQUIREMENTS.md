# KiranaSaathi AI — Requirements Specification

**Version:** 1.0  
**Status:** Approved for Implementation  
**Standard:** Tech4Bharat 2026, Theme 5 (Problem Statement 5.1)  

---

## 1. Functional Requirements (FR)

### FR-01: Authentication, Membership & RBAC
- **FR-01.1 Registration & Authentication:** System must support user registration, credential validation (bcrypt/Argon2id), JWT access tokens (short-lived, 15m), and rotated refresh tokens.
- **FR-01.2 Shop Multi-Tenancy:** Users can own or belong to one or more shops. Every shop-scoped operation must derive tenant context from the user's verified active membership.
- **FR-01.3 Role-Based Permissions:**
  - `owner`: Full administrative privileges, user management, purchase order approvals, inventory adjustments, shop settings.
  - `manager`: Operational management, product catalog edits, sales, goods receiving, PO draft creation, reorder runs.
  - `staff`: Fast POS sales entry, stock receiving, read-only stock lookup.
  - Cross-tenant data access is strictly forbidden and must return `403 Forbidden` or `404 Not Found`.

### FR-02: Product Catalogue & Batch/Expiry Management
- **FR-02.1 Catalog Management:** Create, read, update, and archive products with name, brand, barcode/SKU, category, unit (e.g., `PCS`, `KG`, `L`, `PACK`), reorder point, target cover days, and optional expiry tracking flag.
- **FR-02.2 Batch & Expiry Tracking:** For expiry-tracked products, track distinct lots with batch code, received date, expiry date, initial quantity, and remaining quantity.
- **FR-02.3 Units & Safe Quantities:** Decimal-safe representation for quantities. Mixed unit operations must adhere to defined unit types.

### FR-03: Immutable Inventory Ledger & Balances
- **FR-03.1 Immutable Ledger:** Every inventory alteration creates an append-only `inventoryMovements` document with signed delta, actor, reference type (`sale`, `purchase_receipt`, `customer_return`, `supplier_return`, `wastage`, `manual_adjustment`, `opening_balance`), and idempotency key. Historical records cannot be modified or deleted.
- **FR-03.2 Rebuildable Projections:** `stockBalances` stores current `onHandQty` and `reservedQty` by `{ shopId, productId }`. Must be reconcilable from `inventoryMovements`.
- **FR-03.3 Stock Integrity Invariants:** Negative stock balance is rejected by default. Overselling is prevented via transactional concurrency checks.
- **FR-03.4 Allocation Strategy:** Sales deduct stock from expiry-tracked lots using FEFO (First Expiry, First Out).

### FR-04: Sales & Goods Receiving
- **FR-04.1 Sales Recording:** Atomic transaction recording sale line items and decrementing stock via FEFO. Must be idempotent via `Idempotency-Key` header.
- **FR-04.2 Goods Receiving:** Record incoming stock from suppliers or manual entry, create lots, increment stock balance, and link to existing purchase orders where applicable.
- **FR-04.3 Adjustments & Returns:** Support customer returns (restock or damage), supplier returns, wastage, and manual stock audits with mandatory reason codes.

### FR-05: Deterministic Demand Analytics & Replenishment
- **FR-05.1 Sales Velocity & Demand:** Calculate average daily demand based on observed sales over a configurable window (e.g. 7, 14, 30 days), explicitly filtering out stockout periods.
- **FR-05.2 Explainable Reorder Formula:**
  - `lead_time_demand = avg_daily_demand * lead_time_days`
  - `safety_stock = avg_daily_demand * safety_buffer_days` (or configured minimum)
  - `reorder_point = lead_time_demand + safety_stock`
  - `suggested_qty = max(0, target_stock - (onHand + inbound - reserved))`
- **FR-05.3 Data Quality & Confidence:** Classify recommendations as `HIGH`, `MODERATE`, or `LOW_DATA`. Never assume missing history represents zero demand.
- **FR-05.4 Risk Detection:** Identify slow-moving items and expiring batches (within 15, 30, 60 days).

### FR-06: Supplier & Purchase Order Lifecycle
- **FR-06.1 Supplier Directory & Quotations:** Store supplier details and recorded price/lead-time quotes.
- **FR-06.2 Purchase Order State Machine:**
  - `DRAFT` -> `PENDING_APPROVAL` -> `APPROVED` -> `PLACED_MANUALLY` -> `PARTIALLY_RECEIVED` -> `RECEIVED` (or `REJECTED` / `CANCELLED`).
- **FR-06.3 Approval Gate:** Only `owner` (or explicitly permitted manager) can approve a draft. An approved PO cannot be altered without requiring re-approval.
- **FR-06.4 No Automated External Ordering:** External order placement is logged as `PLACED_MANUALLY`. The system will not perform autonomous bank/supplier transmissions in MVP.

### FR-07: Controlled Agentic AI Orchestration
- **FR-07.1 Bounded Tool Registry:** Agent interacts exclusively via strictly-typed tool calls (`get_stock_summary`, `get_demand_estimate`, `get_expiry_risks`, `create_purchase_order_draft`, `get_purchase_order`, etc.).
- **FR-07.2 Policy & Safety:** Agent has zero direct database or shell access. Consequential actions (creating purchase orders) create drafts and require explicit human approval.
- **FR-07.3 Provider Agnostic Adapter:** Adapter design supporting Lyzr, Google Gemini, or local models with graceful offline/fallback behavior.

### FR-08: Offline Sync & Voice Interface
- **FR-08.1 Offline Synchronization:** Client-generated UUIDs with per-event idempotency, status reporting (`accepted`, `duplicate`, `rejected`), and conflict detection.
- **FR-08.2 Voice Interaction:** Speech-to-intent parsing for sales entry, stock inquiry, and reorder questions with explicit confirmation on ambiguous matches.

---

## 2. Non-Functional Requirements (NFR)

- **NFR-01 Performance:** Standard API read latency P95 < 150ms. Transactional stock mutations P95 < 250ms under typical kirana operations.
- **NFR-02 Idempotency:** Duplicate HTTP requests with identical `Idempotency-Key` must return the original response without duplicate state mutation.
- **NFR-03 Auditability:** All administrative, inventory, and purchase approval actions emit structured audit records with timestamps and actor IDs.
- **NFR-04 Fault Tolerance & Degradation:** If AI or external providers fail, manual stock, sales, and receiving continue without interruption.
- **NFR-05 Security:** Zero plain-text passwords. OWASP Top 10 compliance: parameterized NoSQL queries, input sanitization via Zod, rate limiting, and CORS protection.
