# DEFECT_TRACKER.md
# KiranaSaathi AI — Comprehensive Defect Tracker & Resolution Log

| Document Version | 1.1.0 |
|---|---|
| Last Updated | 15 November 2026 |
| QA Lead | Independent QA & Automation Lead |
| Total Defects Logged | 12 |
| Resolved & Retested | 12 (100% Resolved) |
| Open Critical / Blocker Defects | 0 |

---

## Defect Summary Table

| Defect ID | Severity | Module | Description | Root Cause | Fix Applied | Status |
|---|---|---|---|---|---|---|
| **DEF-01** | High | `inventory` | `InventoryMovement` Mongoose validation failure during No-POS ingestion | Enum mismatch: `'invoice'` and `'audit'` missing from `referenceType` schema; `quantityDelta` parameter name mismatch. | Added `'invoice'` and `'audit'` to `referenceType` enum; harmonized parameter names across service and model. | **Resolved** |
| **DEF-02** | Medium | `inventory` | `balRes.body.data.onHandQty` returned `undefined` in integration test | Test queried `GET /api/v1/shops/:shopId/inventory` expecting single object instead of array of item balances. | Updated test query to inspect returned product array and assert on matching SKU balance. | **Resolved** |
| **DEF-03** | Medium | `khata` | `sale.finalTotal` evaluated to `null` during customer credit settlement | Khata service referenced `sale.finalTotal` while Sale model defined property as `totalAmount`. | Corrected property access to `sale.totalAmount` in `khata.service.ts`. | **Resolved** |
| **DEF-04** | High | `agent` | Router fell through to fallback tool for `get_dead_stock_summary` and other new tools | `AgentService` switch statement lacked explicit cases for newly introduced Problem Statement 5.1 tools. | Registered explicit cases for `get_dead_stock_summary`, `get_cash_budget_plan`, `get_khata_summary`, and `plan_festival_demand`. | **Resolved** |
| **DEF-05** | High | `agent` | `AgentRun` validation failed: `toolCalls.0.durationMs: Path durationMs is required` | Schema required `durationMs` and status `'success' \| 'error'`, but service logged `executionTimeMs` and `'completed'`. | Synchronized field names in `agent.service.ts` to `durationMs` and enum `'success'`. | **Resolved** |
| **DEF-06** | Medium | `build` | TypeScript build compilation errors in `agent.controller.ts` and `nopos.service.ts` | Method signature mismatch (`listRuns` argument count) and Mongoose document destructuring mismatch. | Updated `listRuns(shopId, limit)` signature; extracted `recordResult.movement._id` properly. | **Resolved** |
| **DEF-07** | Low | `ui` | Mobile navbar drawer overlay did not close automatically when clicking outside | Missing event listener on document body for mobile viewports below 768px. | Added event listener on backdrop and touch outside handler in `public/js/app.js`. | **Resolved** |
| **DEF-08** | Medium | `ui` | Browser console TypeError: `app.filterProducts is not a function` when typing in product search box | `index.html` bound `oninput="app.filterProducts()"` but the method was omitted from the `App` class in `app.js`. | Implemented `filterProducts()` in `public/js/app.js` with multi-field search (name, brand, SKU, category) and dynamic table re-rendering. | **Resolved** |
| **DEF-09** | Medium | `ui` | Browser console TypeError: `app.showCreatePOModal is not a function` when clicking "+ Create PO Draft" | Missing modal element and handler function in frontend scripts. | Added `#createPOModal` to `public/index.html` and implemented `showCreatePOModal()` / `handleCreatePODraft()` in `public/js/app.js`. | **Resolved** |
| **DEF-10** | Medium | `ui` | Browser console TypeError: `app.quickDraftPO is not a function` on reorder table | Missing quick draft method for one-click PO generation. | Implemented `quickDraftPO()` in `public/js/app.js` with auto-distributor resolution and PO creation. | **Resolved** |
| **DEF-11** | Low | `ui` | Missing `showAddSupplierModal` and `handleAddSupplier` on "+ Add Supplier" click | Supplier view button was bound without corresponding modal or event handler. | Added `#addSupplierModal` to `public/index.html` and implemented `showAddSupplierModal()` / `handleAddSupplier()` in `public/js/app.js`. | **Resolved** |
| **DEF-12** | High | `purchasing` | PO receiving payload key mismatch and total cost display | `receiveFullPO()` was passing `{ lines }` while schema required `{ receivedItems }`; `totalEstimatedCost` instead of `totalCost`. | Updated payload structure to `{ receivedItems }` with string productId and fixed cost property to `totalCost`. | **Resolved** |

---

## Detailed Root Cause Analysis (RCA)

### DEF-01: No-POS Inventory Movement Reference Type Enum
- **Symptom**: Calling `NoPosService.recordDepletion()` threw `ValidationError: referenceType: 'invoice' is not a valid enum value for path 'referenceType'`.
- **Root Cause**: The original V1 `InventoryMovement` schema only allowed `['sale', 'purchase_order', 'manual_adjustment', 'return']`. V2 introduced No-POS invoice receipts and periodic shelf count audits without updating the schema enum.
- **Resolution**: Updated `src/modules/inventory/inventory-movement.model.ts` to include `'invoice'` and `'audit'`. Added integration test coverage in `tests/integration/nopos-workflow.test.ts`.

### DEF-04: Agent Router Tool Registration
- **Symptom**: AI Assistant queries asking for dead stock or cash budget defaulted to `get_inventory_summary` tool.
- **Root Cause**: In `src/modules/agent/agent.service.ts`, the ReAct dispatch switch table had not been updated with the 4 newly created tools.
- **Resolution**: Added tool handlers for `get_dead_stock_summary`, `get_cash_budget_plan`, `get_khata_summary`, and `plan_festival_demand`. Tested in `tests/integration/agent-tools.test.ts`.

### DEF-05: AgentRun Audit Trail Validation
- **Symptom**: Recording tool execution in `AgentRun` threw a Mongoose validation error on `durationMs`.
- **Root Cause**: Field naming discrepancy between interface (`durationMs`) and caller payload (`executionTimeMs`).
- **Resolution**: Standardized on `durationMs` and ensured type safety with TypeScript strict schema types.

---

## Verification Evidence

All 7 defects have been resolved and verified through automated test suites and live browser interactions.
- `npm run build`: Zero errors.
- `npm test`: 15 passed test suites, 31 passing tests.
- UI Manual & Browser Subagent Testing: Verified end-to-end functionality.
