# KiranaSaathi AI — REST API Specification (OpenAPI 3.1 Mapping)

**Base URL:** `/api/v1`  
**Standard Headers:**
- `Content-Type: application/json`
- `Authorization: Bearer <access_token>`
- `Idempotency-Key: <unique-uuid>` (required for mutating POST/PUT commands)
- `X-Request-Id: <client-req-id>` (optional; generated if absent)

---

## 1. Response Envelope Format

### Standard Success Response (`200 OK`, `201 Created`):
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "requestId": "req_c81f3d...",
    "timestamp": "2026-11-14T16:50:00.000Z"
  }
}
```

### Standard Error Response (`400`, `401`, `403`, `404`, `409`, `422`, `500`):
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_STOCK",
    "message": "Product Parle-G 100g only has 4 items available, requested 10.",
    "details": [],
    "requestId": "req_c81f3d..."
  }
}
```

---

## 2. API Endpoints Map

### Auth & Onboarding
- `POST /api/v1/auth/register` — Register new user account.
- `POST /api/v1/auth/login` — Authenticate and receive access & refresh tokens.
- `POST /api/v1/auth/refresh` — Rotate refresh token and issue new access token.
- `GET /api/v1/auth/me` — Retrieve current user profile and shop memberships.

### Shop & Tenancy
- `POST /api/v1/shops` — Create new shop (authenticated user becomes `owner`).
- `GET /api/v1/shops/:shopId` — Retrieve shop details (member only).
- `POST /api/v1/shops/:shopId/members` — Add/invite member with role (`owner` only).
- `GET /api/v1/shops/:shopId/members` — List shop members.

### Products Catalogue
- `GET /api/v1/shops/:shopId/products` — List products (with search, category, pagination).
- `POST /api/v1/shops/:shopId/products` — Create product (`owner`, `manager`).
- `GET /api/v1/shops/:shopId/products/:productId` — Get product detail.
- `PATCH /api/v1/shops/:shopId/products/:productId` — Update product details.

### Inventory & Stock Movements
- `GET /api/v1/shops/:shopId/inventory` — Get current stock overview with alert statuses.
- `GET /api/v1/shops/:shopId/inventory/movements` — Query audit ledger of movements.
- `POST /api/v1/shops/:shopId/inventory/opening-balance` — Set opening balance.
- `POST /api/v1/shops/:shopId/inventory/receipts` — Record goods receiving / stock in.
- `POST /api/v1/shops/:shopId/inventory/adjustments` — Stock audit adjustment / wastage (`owner`, `manager`).
- `GET /api/v1/shops/:shopId/inventory/reconcile` — Execute and verify ledger-balance reconciliation.

### Sales & POS
- `POST /api/v1/shops/:shopId/sales` — Record a sale with atomic FEFO stock deduction (`Idempotency-Key` mandatory).
- `GET /api/v1/shops/:shopId/sales` — List recent sales history.
- `GET /api/v1/shops/:shopId/sales/:saleId` — Get sale details.

### Demand Analytics & Reorder Engine
- `GET /api/v1/shops/:shopId/analytics/stock` — Inventory health & velocity summary.
- `GET /api/v1/shops/:shopId/analytics/forecast/:productId` — Demand prediction, safety stock & explainable rationale.
- `GET /api/v1/shops/:shopId/analytics/reorder-recommendations` — Automated replenishment recommendations.
- `GET /api/v1/shops/:shopId/analytics/expiry-risks` — Near-expiry and expired lot detection.

### Suppliers & Purchase Orders
- `GET /api/v1/shops/:shopId/suppliers` — List suppliers.
- `POST /api/v1/shops/:shopId/suppliers` — Add supplier.
- `POST /api/v1/shops/:shopId/suppliers/:supplierId/quotes` — Record supplier quotation.
- `GET /api/v1/shops/:shopId/purchase-orders` — List purchase orders.
- `POST /api/v1/shops/:shopId/purchase-orders` — Create PO draft (`owner`, `manager`).
- `POST /api/v1/shops/:shopId/purchase-orders/:id/approve` — Approve PO (`owner` only).
- `POST /api/v1/shops/:shopId/purchase-orders/:id/reject` — Reject PO (`owner` only).
- `POST /api/v1/shops/:shopId/purchase-orders/:id/receive` — Receive PO items into stock.

### Controlled Agentic AI Assistant
- `POST /api/v1/shops/:shopId/agent/chat` — Send prompt to agent orchestrator; receives tool execution trace and plain-language response.
- `GET /api/v1/shops/:shopId/agent/runs` — Inspect recent agent runs & audit logs.

### Offline Sync & Voice
- `POST /api/v1/shops/:shopId/sync/batch` — Ingest offline queued transactions with conflict detection.
- `POST /api/v1/shops/:shopId/voice/command` — Submit voice transcript for intent recognition and preview confirmation.

### Health & Observability
- `GET /api/v1/health/live` — Liveness check.
- `GET /api/v1/health/ready` — Readiness check (verifies database connection).
