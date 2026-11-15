import { execSync } from 'child_process';
import fs from 'fs';

function getCommitMessage(file) {
  const customMessages = {
    '.gitignore': 'chore: add gitignore rules for node, dist, and environment files',
    '.env.example': 'chore: add environment variable templates',
    'package.json': 'build: add package manifest and dependencies',
    'package-lock.json': 'build: lock dependency tree',
    'tsconfig.json': 'build: configure TypeScript strict mode and compiler options',
    'vitest.config.ts': 'test: configure Vitest test runner and setup hooks',
    'workflows.md': 'docs: add V2 authoritative execution workflow specification',
    'workflows_v1_reference.md': 'docs: add V1 reference specification for historical audit',
    'README.md': 'docs: add project overview, architecture, and runbook',

    'docs/AGENT_POLICY.md': 'docs: document Agentic AI tool policies and security constraints',
    'docs/API.md': 'docs: document REST API contracts and error formats',
    'docs/ARCHITECTURE.md': 'docs: specify system architecture, invariants, and component boundaries',
    'docs/DATA_MODEL.md': 'docs: specify entity relationship diagrams and database schema',
    'docs/DEMO_RUNBOOK.md': 'docs: add demonstration runbook and test walkthrough',
    'docs/FEATURE_TRACEABILITY.md': 'docs: add PS-01 through PS-18 feature traceability matrix',
    'docs/FINAL_QA_REPORT.md': 'docs: document final QA results and test verification logs',
    'docs/IMPLEMENTATION_STATUS.md': 'docs: document feature implementation ledger and invariant status',
    'docs/INDEPENDENT_AUDIT.md': 'docs: add independent verification and hardening report',
    'docs/REPOSITORY_AUDIT.md': 'docs: add repository discovery and baseline audit report',
    'docs/REQUIREMENTS.md': 'docs: specify functional and non-functional requirements',
    'docs/SECURITY_REVIEW.md': 'docs: add multi-tenant isolation and security audit report',

    'scripts/cache-mongo.ts': 'scripts: add helper to pre-cache MongoDB memory server binary',
    'scripts/seed-demo-data.ts': 'scripts: add realistic demo dataset seeder for all V2 features',

    'public/css/styles.css': 'ui: add clean responsive styles for kirana operator interface',
    'public/index.html': 'ui: add operator SPA views, modals, and navigation layout',
    'public/js/app.js': 'ui: add client application state and REST API integration',

    'src/config/database.ts': 'feat(config): add MongoDB and in-memory database connection manager',
    'src/config/env.ts': 'feat(config): add Zod-validated environment configuration',
    'src/config/logger.ts': 'feat(config): add structured JSON logger',

    'src/common/errors/app-error.ts': 'feat(common): add typed operational application error hierarchy',
    'src/common/middleware/auth.middleware.ts': 'feat(middleware): add JWT authentication middleware',
    'src/common/middleware/error.middleware.ts': 'feat(middleware): add centralized Express error handling middleware',
    'src/common/middleware/idempotency.middleware.ts': 'feat(middleware): add request idempotency middleware with caching',
    'src/common/middleware/request-id.middleware.ts': 'feat(middleware): add correlation request ID tracking middleware',
    'src/common/middleware/tenant.middleware.ts': 'feat(middleware): add tenant isolation and role-based access control middleware',
    'src/common/middleware/validation.middleware.ts': 'feat(middleware): add Zod request body and query validation middleware',
    'src/common/models/idempotency.model.ts': 'feat(common): add idempotency record Mongoose schema',
    'src/common/types/index.ts': 'feat(common): define core domain types and roles',
    'src/common/utils/crypto.ts': 'feat(common): add password hashing and JWT token utilities',
    'src/common/utils/response.ts': 'feat(common): add standard API success and error response helpers',

    'src/app.ts': 'feat: assemble Express application and mount modular routes',
    'src/server.ts': 'feat: implement HTTP server startup and graceful shutdown lifecycle',

    'src/modules/health/health.routes.ts': 'feat(health): add liveness and readiness probe routes',

    'src/modules/auth/auth.model.ts': 'feat(auth): add user account Mongoose model and password hashing',
    'src/modules/auth/auth.schema.ts': 'feat(auth): add Zod validation schemas for auth endpoints',
    'src/modules/auth/auth.service.ts': 'feat(auth): implement user registration, login, and token rotation',
    'src/modules/auth/auth.controller.ts': 'feat(auth): add auth HTTP request controllers',
    'src/modules/auth/auth.routes.ts': 'feat(auth): add auth router and endpoint mappings',

    'src/modules/shops/shop.model.ts': 'feat(shops): add shop store configuration Mongoose model',
    'src/modules/shops/membership.model.ts': 'feat(shops): add tenant membership and role assignments model',
    'src/modules/shops/shop.schema.ts': 'feat(shops): add shop creation and member validation schemas',
    'src/modules/shops/shop.service.ts': 'feat(shops): implement shop creation and membership service',
    'src/modules/shops/activation.service.ts': 'feat(shops): implement 7-day guided onboarding activation milestone tracker (PS-11)',
    'src/modules/shops/shop.controller.ts': 'feat(shops): add shop and activation status controllers',
    'src/modules/shops/shop.routes.ts': 'feat(shops): add shop management routes and activation endpoints',

    'src/modules/products/product.model.ts': 'feat(products): add product catalogue model with partial unique indexes',
    'src/modules/products/product.schema.ts': 'feat(products): add product creation and update validation schemas',
    'src/modules/products/product.service.ts': 'feat(products): implement product catalogue CRUD and opening balance linkage',
    'src/modules/products/product-alias.model.ts': 'feat(products): add multilingual product alias dictionary model (PS-10)',
    'src/modules/products/product-alias.service.ts': 'feat(products): implement token, phonetic, and fuzzy alias resolution engine (PS-10)',
    'src/modules/products/product.controller.ts': 'feat(products): add product and alias resolution controllers',
    'src/modules/products/product.routes.ts': 'feat(products): add product routes and alias management endpoints',

    'src/modules/inventory/inventory-movement.model.ts': 'feat(inventory): add append-only immutable stock movement ledger model',
    'src/modules/inventory/stock-balance.model.ts': 'feat(inventory): add rebuildable stock balance projection model',
    'src/modules/inventory/inventory-lot.model.ts': 'feat(inventory): add FEFO inventory lot tracking model',
    'src/modules/inventory/inventory.schema.ts': 'feat(inventory): add inventory adjustment and receipt validation schemas',
    'src/modules/inventory/inventory.service.ts': 'feat(inventory): implement atomic stock movements, FEFO deduction, and ledger reconciliation',
    'src/modules/inventory/inventory.controller.ts': 'feat(inventory): add inventory movement and reconciliation controllers',
    'src/modules/inventory/inventory.routes.ts': 'feat(inventory): add inventory ledger and receipt routes',

    'src/modules/sales/sale.model.ts': 'feat(sales): add customer sale transaction model with payment method tracking',
    'src/modules/sales/sale.schema.ts': 'feat(sales): add POS sale creation validation schemas',
    'src/modules/sales/sale.service.ts': 'feat(sales): implement atomic multi-item POS sales with compensating rollback',
    'src/modules/sales/sale.controller.ts': 'feat(sales): add sales HTTP request controller',
    'src/modules/sales/sale.routes.ts': 'feat(sales): add sales transaction routes',

    'src/modules/nopos/stock-snapshot.model.ts': 'feat(nopos): add physical shelf count snapshot audit model (PS-05)',
    'src/modules/nopos/depletion-observation.model.ts': 'feat(nopos): add daily informal voice/text depletion observation model (PS-05)',
    'src/modules/nopos/invoice-ingestion.model.ts': 'feat(nopos): add distributor bill ingestion and review queue model (PS-09)',
    'src/modules/nopos/nopos.service.ts': 'feat(nopos): implement No-POS operating engine, variance reconciliation, and invoice commit (PS-05, PS-09)',
    'src/modules/nopos/nopos.controller.ts': 'feat(nopos): add No-POS operations controller',
    'src/modules/nopos/nopos.routes.ts': 'feat(nopos): add No-POS shelf counts, depletions, and invoice routes',

    'src/modules/analytics/forecasting.service.ts': 'feat(analytics): implement deterministic demand estimation, near-expiry risks, and dead stock analysis (PS-01, PS-03)',
    'src/modules/analytics/budget-allocation.service.ts': 'feat(analytics): implement owner cash budget replenishment knapsack allocation (PS-12)',
    'src/modules/analytics/festival.service.ts': 'feat(analytics): implement regional festival demand surge scenario planner (PS-04)',
    'src/modules/analytics/aggregate-demand.service.ts': 'feat(analytics): implement privacy-preserving aggregate demand signals under k-anonymity (PS-16)',
    'src/modules/analytics/analytics.controller.ts': 'feat(analytics): add analytics, budget, and festival controllers',
    'src/modules/analytics/analytics.routes.ts': 'feat(analytics): add replenishment, dead stock, and festival routes',

    'src/modules/khata/khata.model.ts': 'feat(khata): add customer credit ledger and transaction entry model (PS-08)',
    'src/modules/khata/khata.service.ts': 'feat(khata): implement Khata credit tracking and core liquidity invariant enforcement (PS-08)',
    'src/modules/khata/khata.controller.ts': 'feat(khata): add customer Khata and liquidity controllers',
    'src/modules/khata/khata.routes.ts': 'feat(khata): add customer credit and collection routes',

    'src/modules/suppliers/supplier.model.ts': 'feat(suppliers): add supplier directory model with lead time tracking',
    'src/modules/suppliers/supplier-quote.model.ts': 'feat(suppliers): add supplier quotation model with price and MOQ',
    'src/modules/suppliers/supplier.schema.ts': 'feat(suppliers): add supplier and quote validation schemas',
    'src/modules/suppliers/supplier.service.ts': 'feat(suppliers): implement supplier quotation comparison service',
    'src/modules/suppliers/supplier.controller.ts': 'feat(suppliers): add supplier directory controllers',
    'src/modules/suppliers/supplier.routes.ts': 'feat(suppliers): add supplier and quote routes',

    'src/modules/purchasing/purchase-order.model.ts': 'feat(purchasing): add purchase order model with approval state machine and versioning',
    'src/modules/purchasing/purchasing.schema.ts': 'feat(purchasing): add purchase order draft and receiving validation schemas',
    'src/modules/purchasing/purchasing.service.ts': 'feat(purchasing): implement owner-only PO approval gate and goods receiving validation (PS-13)',
    'src/modules/purchasing/pooled-purchase.model.ts': 'feat(purchasing): add pooled purchase joint order proposal model (PS-15)',
    'src/modules/purchasing/pooled-purchase.service.ts': 'feat(purchasing): implement neighbourhood pooled purchasing with independent owner liability (PS-15)',
    'src/modules/purchasing/purchasing.controller.ts': 'feat(purchasing): add purchase order and pooled purchase controllers',
    'src/modules/purchasing/purchasing.routes.ts': 'feat(purchasing): add purchase order and pooled purchasing routes',

    'src/modules/agent/agent-run.model.ts': 'feat(agent): add agent execution run audit log model',
    'src/modules/agent/agent.tools.ts': 'feat(agent): add allowlisted domain tools registry for No-POS, dead stock, and budget plans (PS-17)',
    'src/modules/agent/provider.adapter.ts': 'feat(agent): add Gemini function calling adapter with DeterministicLocalAdapter offline fallback',
    'src/modules/agent/agent.service.ts': 'feat(agent): implement controlled agent loop with tool verification and audit trails',
    'src/modules/agent/agent.controller.ts': 'feat(agent): add agent chat and execution run controllers',
    'src/modules/agent/agent.routes.ts': 'feat(agent): add agent chat and run history routes',

    'src/modules/sync/sync.model.ts': 'feat(sync): add offline sync event record model for idempotent replay',
    'src/modules/sync/sync.schema.ts': 'feat(sync): add offline sync batch validation schemas',
    'src/modules/sync/sync.service.ts': 'feat(sync): implement offline sync batch ingestion with conflict resolution',
    'src/modules/sync/sync.controller.ts': 'feat(sync): add offline sync batch controller',
    'src/modules/sync/sync.routes.ts': 'feat(sync): add offline sync routes',

    'src/modules/voice/voice.service.ts': 'feat(voice): implement speech transcript intent parser with confirmation step',
    'src/modules/voice/voice.controller.ts': 'feat(voice): add voice transcript command controller',
    'src/modules/voice/voice.routes.ts': 'feat(voice): add voice transcription routes',

    'tests/helpers/setup.ts': 'test(helpers): add shared MongoMemoryServer lifecycle and isolation helpers',
    'tests/integration/auth-tenancy.test.ts': 'test(auth): add JWT auth and strict multi-tenant isolation tests',
    'tests/integration/inventory-ledger.test.ts': 'test(inventory): add immutable ledger, opening balance, and idempotency tests',
    'tests/integration/sales-receiving.test.ts': 'test(sales): add multi-item POS sales and atomic FEFO deduction tests',
    'tests/integration/concurrency-race.test.ts': 'test(concurrency): add high-concurrency race condition and oversell defense tests',
    'tests/integration/purchasing-approval.test.ts': 'test(purchasing): add owner-only approval gate and receiving tests',
    'tests/integration/forecasting.test.ts': 'test(forecasting): add demand estimation, expiry risk, and dead stock tests (PS-01, PS-03)',
    'tests/integration/product-alias.test.ts': 'test(products): add local language product name and alias resolution tests (PS-10)',
    'tests/integration/nopos-workflow.test.ts': 'test(nopos): add shelf snapshot, depletion, and invoice review queue tests (PS-05, PS-09)',
    'tests/integration/budget-replenishment.test.ts': 'test(budget): add hard cash budget cap and knapsack allocation tests (PS-12)',
    'tests/integration/khata.test.ts': 'test(khata): add customer credit ledger and core liquidity invariant tests (PS-08)',
    'tests/integration/festival.test.ts': 'test(festival): add festive demand surge scenario planner tests (PS-04)',
    'tests/integration/pooled-and-aggregate.test.ts': 'test(pooled): add pooled purchases and privacy-preserving demand tests (PS-15, PS-16)',
    'tests/integration/offline-voice.test.ts': 'test(sync): add offline sync batch and voice intent parsing tests (PS-18)',
    'tests/integration/agent-tools.test.ts': 'test(agent): add sandboxed Agentic AI tool execution and audit tests (PS-17)',
    'tests/e2e/complete-kirana-workflow.test.ts': 'test(e2e): add complete 12-step KiranaSaathi business lifecycle test'
  };

  const norm = file.replace(/\\/g, '/');
  if (customMessages[norm]) {
    return customMessages[norm];
  }

  // Fallback pattern generator
  const parts = norm.split('/');
  const filename = parts[parts.length - 1];
  const dir = parts.length > 1 ? parts[0] : '';
  const sub = parts.length > 2 ? parts[1] : '';

  if (dir === 'src') {
    return `feat(${sub || 'core'}): add ${filename}`;
  }
  if (dir === 'tests') {
    return `test(${sub || 'unit'}): add ${filename}`;
  }
  if (dir === 'docs') {
    return `docs: add ${filename}`;
  }
  return `chore: add ${filename}`;
}

const rawFiles = execSync('git ls-files --others --exclude-standard', { encoding: 'utf-8' });
const files = rawFiles.split(/\r?\n/).map(f => f.trim()).filter(Boolean);

console.log(`Found ${files.length} untracked files to commit individually.`);

let count = 0;
for (const file of files) {
  if (file === 'scripts/commit-separately.js') continue;
  count++;
  const msg = getCommitMessage(file);
  console.log(`[${count}/${files.length}] Staging and committing: ${file}`);
  console.log(`  -> "${msg}"`);
  
  execSync(`git add "${file}"`);
  execSync(`git commit -m "${msg}"`);
}

console.log(`\n🎉 Successfully committed all ${count} files separately with meaningful commit messages!`);
