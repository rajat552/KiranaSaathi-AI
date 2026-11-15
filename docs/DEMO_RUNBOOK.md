# KiranaSaathi AI — Demonstration Runbook

**Competition:** Tech4Bharat — GAVS Hackathon 2026  
**Theme:** Rural FMCG & Logistics (Theme 5, Problem Statement 5.1)  
**Target Audience:** Competition Judges, Evaluators, and Technical Reviewers  

---

## 1. Quick Start (Zero-Configuration Demo)

The KiranaSaathi AI server is completely self-contained. If you do not have a local MongoDB instance installed, it automatically boots an in-memory MongoDB engine (`mongodb-memory-server`) with zero external configuration required.

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Seed Demo Kirana Data
Run the demo seeding script to populate realistic FMCG inventory (staples, biscuits, oil, atta, near-expiry bread, and supplier quotes):
```bash
npm run seed
```

### Step 3: Launch the Application
```bash
npm start
# OR for live development with watch mode:
npm run dev
```

The application will start on:
👉 **`http://localhost:4000`**

Open your web browser and navigate to `http://localhost:4000`.

---

## 2. Guided 5-Minute Demonstration Script

### Journey 1: Visual Dashboard & Real-Time KPIs
1. Open `http://localhost:4000`.
2. Notice the top store header showing **"Sri Murugan Super Store"** and **"OWNER"** role.
3. Observe the KPI cards: Total Products, Low Stock Items (flagged in red), Near-Expiry Lots (warning in amber), and Pending PO Drafts.
4. Review the **Urgent Actions** card highlighting items that need immediate replenishment (e.g. *Parle-G Gold Biscuits 100g* with only 6 packs left against a reorder threshold of 30).

### Journey 2: Point of Sale (POS) & Atomic Stock Deduction
1. Click **"🛒 Sales & POS"** on the sidebar.
2. Under "Record Customer Sale":
   - Select **"Tata Salt Vacuum Evaporated 1kg"** (shows available stock: 45).
   - Enter Quantity: **5**.
   - Notice unit price auto-populates (₹28.00) and Total updates to **₹140.00**.
   - Select Payment Mode: **UPI**.
   - Click **"⚡ Record Sale & Deduct Stock"**.
3. An alert confirms the sale with an official invoice number (e.g. `INV-20261114-xxxx`).
4. Notice the recent sales table updates immediately.
5. Navigate to **"📦 Products & Inventory"**: Tata Salt stock has automatically decreased from 45 to **40** exactly once.

### Journey 3: Deterministic Replenishment Recommendations
1. Click **"📈 Reorder Recommendations"**.
2. Review the explainable recommendation cards:
   - *Parle-G Gold Biscuits 100g* is flagged with **"REORDER NEEDED"**.
   - Shows: Current Stock (6 PACK), Sales Velocity (~1.5 PACK/day), Supplier Lead Time (3 days), Reorder Threshold (30 PACK), and **Suggested Reorder Quantity (40 PACK)**.
   - Shows data quality indicator (`MODERATE` or `HIGH`) and clear mathematical explanation.

### Journey 4: Interactive Agentic AI & Voice Assistant
1. Click **"🤖 AI Voice Assistant"** on the sidebar.
2. In the chat box, type:
   > *"What should I reorder today?"*
   and click **Send** (or click the **🎙️ Speak** button to use speech recognition).
3. The AI orchestrator interprets the intent, executes the allowlisted backend tool `calculate_reorder`, and responds with grounded evidence:
   - Highlights the exact items below threshold.
   - Emits a visible badge: `🔧 calculate_reorder`.
   - Offers to create a draft purchase order.
4. Next, type:
   > *"Which products are low on stock?"*
   Notice it invokes `get_low_stock_items` and lists the products.

### Journey 5: Controlled Purchase Order Approval & Receiving
1. Click **"📑 Purchase Orders"**.
2. Notice any existing draft POs. Click **"Approve PO"**.
3. Confirm the dialog: Notice the PO status changes to **APPROVED**.
4. Important check: Verify on the inventory screen that approving the PO **DID NOT** prematurely increase stock.
5. Return to Purchase Orders and click **"Receive Goods"**.
6. The delivery items are received, the PO transitions to **RECEIVED**, and the inventory balance is incremented in the immutable ledger.

### Journey 6: Auditing the Immutable Ledger
1. Click **"📜 Audit Ledger"**.
2. Observe every single physical movement: `opening_balance`, `sale`, and `purchase_receipt`.
3. Notice that each row records the actor, signed quantity delta (`+` in green, `-` in red), unit cost, and timestamp.
4. Click **"⚖️ Reconcile Ledger"** on the Products screen: The system scans the entire history of movements and confirms 100% mathematical consistency with projected balances.

---

## 3. Running Automated Verification Tests

To verify all 16 integration, security, and end-to-end tests:
```bash
npm test
```

Expected output:
```text
Test Files  8 passed (8)
     Tests  16 passed (16)
```
