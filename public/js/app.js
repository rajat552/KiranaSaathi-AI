/**
 * KiranaSaathi AI Frontend Application
 * Interacts with backend REST APIs at /api/v1
 */

class KiranaApp {
  constructor() {
    this.apiBase = '/api/v1';
    this.token = localStorage.getItem('ks_token') || '';
    this.shopId = localStorage.getItem('ks_shop_id') || '';
    this.role = localStorage.getItem('ks_role') || 'owner';
    this.products = [];
    this.isRecordingVoice = false;

    this.init();
  }

  async init() {
    this.setupNavigation();
    await this.ensureAuthAndShop();
    await this.refreshAll();
  }

  setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.view-section').forEach(s => s.classList.remove('active'));

        btn.classList.add('active');
        const viewId = btn.getAttribute('data-view');
        const view = document.getElementById(`view-${viewId}`);
        if (view) view.classList.add('active');

        // Auto close mobile drawer if open
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) sidebar.classList.remove('open');

        if (viewId === 'dashboard') this.loadActivationMilestones();
        if (viewId === 'nopos') this.loadNoPosData();
        if (viewId === 'budget') this.loadBudgetReplenishment();
        if (viewId === 'khata') this.loadKhataData();
        if (viewId === 'festivals') this.loadFestivalScenarios();
        if (viewId === 'replenishment') this.loadReplenishment();
        if (viewId === 'expiry') { this.loadExpiry(); this.loadDeadStockAnalysis(); }
        if (viewId === 'purchasing') this.loadPurchaseOrders();
        if (viewId === 'suppliers') this.loadSuppliers();
        if (viewId === 'audit') this.loadAuditMovements();
      });
    });

    document.getElementById('logoutBtn')?.addEventListener('click', () => {
      localStorage.clear();
      window.location.reload();
    });
  }

  toggleMobileNav() {
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) sidebar.classList.toggle('open');
  }

  async ensureAuthAndShop() {
    try {
      if (!this.token) {
        const regRes = await fetch(`${this.apiBase}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Murugan Pillai (Owner)',
            email: 'murugan.owner@kirana.in',
            password: 'KiranaPassword2026!'
          })
        });

        let data = await regRes.json();
        if (!regRes.ok) {
          const logRes = await fetch(`${this.apiBase}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              identifier: 'murugan.owner@kirana.in',
              password: 'KiranaPassword2026!'
            })
          });
          data = await logRes.json();
        }

        if (data.data && data.data.accessToken) {
          this.token = data.data.accessToken;
          localStorage.setItem('ks_token', this.token);
        }
      }

      const meRes = await this.apiGet('/auth/me');
      if (meRes.success) {
        const memberships = meRes.data.memberships || [];
        if (memberships.length > 0) {
          this.shopId = memberships[0].shopId;
          this.role = memberships[0].role;
          localStorage.setItem('ks_shop_id', this.shopId);
          localStorage.setItem('ks_role', this.role);
          document.getElementById('headerShopName').textContent = memberships[0].shopName || 'Kirana Store';
          document.getElementById('headerUserRole').textContent = this.role.toUpperCase();
        } else {
          const shopRes = await this.apiPost('/shops', {
            name: 'Sri Murugan Super Store',
            address: '15 Main Bazaar, Madurai'
          });
          if (shopRes.success) {
            this.shopId = shopRes.data.shop.id;
            this.role = 'owner';
            localStorage.setItem('ks_shop_id', this.shopId);
            localStorage.setItem('ks_role', this.role);
            document.getElementById('headerShopName').textContent = shopRes.data.shop.name;
          }
        }
      }
    } catch (err) {
      console.error('Auth initialization error:', err);
    }
  }

  async apiGet(path) {
    try {
      const res = await fetch(`${this.apiBase}${path}`, {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: { message: err.message } };
    }
  }

  async apiPost(path, body = {}, idempotencyKey = '') {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      };
      if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

      const res = await fetch(`${this.apiBase}${path}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(body)
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: { message: err.message } };
    }
  }

  async apiPatch(path, body = {}) {
    try {
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.token}`
      };
      const res = await fetch(`${this.apiBase}${path}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body)
      });
      return await res.json();
    } catch (err) {
      return { success: false, error: { message: err.message } };
    }
  }

  async refreshAll() {
    if (!this.shopId) return;
    await Promise.all([
      this.loadActivationMilestones(),
      this.loadProducts(),
      this.loadKhataLiquidityKPI(),
      this.loadDashboardKPIs()
    ]);
  }

  async loadActivationMilestones() {
    const res = await this.apiGet(`/shops/${this.shopId}/activation-status`);
    if (!res.success) return;

    const data = res.data;
    document.getElementById('activationBadge').textContent = `${data.completionRate}% Activated`;
    document.getElementById('activationBadge').style.background = data.isFullyActivated ? 'var(--success)' : 'var(--primary)';
    document.getElementById('activationNextStep').textContent = data.nextRecommendedStep;

    const container = document.getElementById('activationMilestonesList');
    container.innerHTML = data.milestones.map(m => `
      <div style="background: white; padding: 10px; border-radius: 6px; border: 1px solid var(--border-color); font-size: 0.85rem;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
          <strong>Day ${m.dayTarget}</strong>
          <span>${m.completed ? '✅ Done' : '⏳ Pending'}</span>
        </div>
        <div style="font-weight: 600; color: var(--text-main);">${m.title}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 2px;">${m.description}</div>
      </div>
    `).join('');
  }

  async loadKhataLiquidityKPI() {
    const res = await this.apiGet(`/shops/${this.shopId}/khata/liquidity-context`);
    if (res.success) {
      document.getElementById('kpiLiquidCash').textContent = `₹${Math.round(res.data.safeReplenishmentCashCap)}`;
    }
  }

  async loadProducts() {
    const res = await this.apiGet(`/shops/${this.shopId}/products?limit=100`);
    if (res.success) {
      this.products = res.data.products || [];
      this.renderProductsTable();
      this.populateProductSelects();
    }
  }

  filterProducts() {
    const q = (document.getElementById('productSearchInput')?.value || '').toLowerCase().trim();
    if (!q) {
      this.renderProductsTable(this.products);
      return;
    }
    const filtered = this.products.filter(p =>
      (p.name && p.name.toLowerCase().includes(q)) ||
      (p.brand && p.brand.toLowerCase().includes(q)) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q))
    );
    this.renderProductsTable(filtered);
  }

  renderProductsTable(items = this.products) {
    const tbody = document.getElementById('productsTableBody');
    if (!tbody) return;
    if (!items || !items.length) {
      tbody.innerHTML = '<tr><td colspan="7">No products registered yet. Click "+ Add Product" to seed catalogue.</td></tr>';
      return;
    }

    tbody.innerHTML = items.map(p => `
      <tr>
        <td><strong>${p.name}</strong> ${p.brand ? `<span style="font-size:0.8rem; color:var(--text-muted);">(${p.brand})</span>` : ''}</td>
        <td>${p.category}</td>
        <td>₹${p.costPrice} / ₹${p.sellingPrice}</td>
        <td><strong>${p.onHandQty !== undefined ? p.onHandQty : '-'}</strong> ${p.unit}</td>
        <td>${p.reorderPoint} ${p.unit}</td>
        <td><span class="badge ${p.status === 'active' ? 'badge-success' : 'badge-danger'}">${p.status.toUpperCase()}</span></td>
        <td>
          <button class="btn btn-secondary btn-sm" onclick="app.showReceiveModal('${p._id}', '${escape(p.name)}', ${p.costPrice})">+ Stock</button>
        </td>
      </tr>
    `).join('');
  }

  populateProductSelects() {
    const selects = ['posProductSelect', 'snapshotProductSelect'];
    selects.forEach(id => {
      const el = document.getElementById(id);
      if (!el) return;
      el.innerHTML = this.products.map(p => `<option value="${p._id}">${p.name} (₹${p.sellingPrice})</option>`).join('');
    });
  }

  async loadDashboardKPIs() {
    const [invRes, expiryRes, poRes] = await Promise.all([
      this.apiGet(`/shops/${this.shopId}/inventory`),
      this.apiGet(`/shops/${this.shopId}/analytics/expiry-risks?horizonDays=30`),
      this.apiGet(`/shops/${this.shopId}/purchase-orders?status=DRAFT`)
    ]);

    if (invRes.success) {
      const items = invRes.data || [];
      document.getElementById('kpiTotalProducts').textContent = items.length;
      const lowCount = items.filter(i => i.isLowStock).length;
      document.getElementById('kpiLowStock').textContent = lowCount;
    }

    if (expiryRes.success) {
      document.getElementById('kpiNearExpiry').textContent = expiryRes.data.length || 0;
    }

    // Load dead stock summary for alerts
    const deadRes = await this.apiGet(`/shops/${this.shopId}/analytics/dead-stock-analysis`);
    const alertsDiv = document.getElementById('dashboardAlertsList');

    let alertsHtml = '';
    if (deadRes.success && deadRes.data.summary.bucket90Plus.count > 0) {
      alertsHtml += `
        <div style="background: #fef2f2; border-left: 4px solid var(--danger); padding: 12px; margin-bottom: 10px; border-radius: 4px;">
          <strong>⚠️ Dead Stock Alert (PS-01):</strong> You have <strong>₹${deadRes.data.summary.bucket90Plus.capital}</strong> locked in ${deadRes.data.summary.bucket90Plus.count} items stagnant for >90 days. Check Expiry & Dead Stock view to liquidate.
        </div>
      `;
    }

    alertsHtml += `
      <div style="padding: 10px; background: #f8fafc; border: 1px solid var(--border-color); border-radius: 6px;">
        💡 <strong>Pro-Tip:</strong> Use the <strong>"Cash Budget Plan"</strong> tab before issuing supplier purchase orders to guarantee you never spend beyond your weekly cash capacity.
      </div>
    `;
    alertsDiv.innerHTML = alertsHtml;
  }

  // NO-POS OPERATIONS (PS-05 & PS-09)
  async loadNoPosData() {
    const [invRes, snapRes] = await Promise.all([
      this.apiGet(`/shops/${this.shopId}/nopos/invoices`),
      this.apiGet(`/shops/${this.shopId}/nopos/snapshots`)
    ]);

    const invTbody = document.getElementById('invoicesTableBody');
    if (invRes.success && invRes.data.length > 0) {
      invTbody.innerHTML = invRes.data.map(inv => `
        <tr>
          <td><strong>${inv.invoiceNumber || inv._id}</strong></td>
          <td>${inv.lineItems.length} lines</td>
          <td>₹${inv.totalAmount}</td>
          <td><span class="badge ${inv.status === 'COMMITTED' ? 'badge-success' : inv.status === 'VERIFIED' ? 'badge-primary' : 'badge-warning'}">${inv.status}</span></td>
          <td>
            ${inv.status === 'VERIFIED' ? `<button class="btn btn-success btn-sm" onclick="app.handleCommitInvoice('${inv._id}')">Commit to Stock</button>` : inv.status === 'PENDING_REVIEW' ? `<span style="font-size:0.8rem; color:var(--text-muted);">Lines under review</span>` : `✅ Done`}
          </td>
        </tr>
      `).join('');
    } else {
      invTbody.innerHTML = '<tr><td colspan="5">No distributor invoices uploaded yet. Click "+ Ingest Supplier Invoice".</td></tr>';
    }

    const snapTbody = document.getElementById('snapshotsTableBody');
    if (snapRes.success && snapRes.data.length > 0) {
      snapTbody.innerHTML = snapRes.data.map(s => `
        <tr>
          <td>${new Date(s.createdAt).toLocaleDateString()}</td>
          <td>Physical Audit</td>
          <td style="color:${s.totalVarianceValue < 0 ? 'var(--danger)' : 'var(--success)'};">₹${s.totalVarianceValue}</td>
          <td>${s.items.length} items counted</td>
          <td><span class="badge badge-success">APPLIED</span></td>
        </tr>
      `).join('');
    } else {
      snapTbody.innerHTML = '<tr><td colspan="5">No physical shelf audits recorded yet.</td></tr>';
    }
  }

  async handleRecordDepletion(e) {
    e.preventDefault();
    const text = document.getElementById('depletionInput').value;
    const match = text.match(/(\d+)/);
    const qty = match ? parseInt(match[0], 10) : 1;

    const res = await this.apiPost(`/shops/${this.shopId}/nopos/depletions`, {
      rawTranscription: text,
      source: 'text',
      items: [{ rawText: text, quantity: qty }]
    });

    if (res.success) {
      alert(`✅ Recorded depletion: ${qty} units (${res.data.totalEstimatedRevenue ? `₹${res.data.totalEstimatedRevenue} revenue` : ''}). Ledger balance adjusted.`);
      document.getElementById('depletionInput').value = '';
      await this.refreshAll();
    } else {
      alert(`❌ Error: ${res.error?.message}`);
    }
  }

  showAddSnapshotModal() {
    this.populateProductSelects();
    document.getElementById('snapshotModal').classList.add('active');
  }

  async handleRecordSnapshot(e) {
    e.preventDefault();
    const productId = document.getElementById('snapshotProductSelect').value;
    const countedQty = parseFloat(document.getElementById('snapshotCountedQty').value);
    const notes = document.getElementById('snapshotNotes').value;

    const res = await this.apiPost(`/shops/${this.shopId}/nopos/snapshots`, {
      notes,
      items: [{ productId, countedQty }]
    });

    if (res.success) {
      alert('✅ Shelf snapshot recorded! Discrepancy reconciled in immutable ledger.');
      this.closeModals();
      await this.loadNoPosData();
      await this.refreshAll();
    } else {
      alert(`❌ Error: ${res.error?.message}`);
    }
  }

  showAddInvoiceModal() {
    document.getElementById('invoiceModal').classList.add('active');
  }

  async handleIngestInvoice(e) {
    e.preventDefault();
    const invoiceNumber = document.getElementById('invModalNum').value;
    const rawDescription = document.getElementById('invModalDesc').value;
    const quantity = parseFloat(document.getElementById('invModalQty').value);
    const unitCost = parseFloat(document.getElementById('invModalCost').value);

    const res = await this.apiPost(`/shops/${this.shopId}/nopos/invoices`, {
      invoiceNumber,
      lines: [{ rawDescription, quantity, unitCost }]
    });

    if (res.success) {
      alert('✅ Invoice ingested into review queue! Lines matched via local alias resolution.');
      this.closeModals();
      await this.loadNoPosData();
    } else {
      alert(`❌ Error: ${res.error?.message}`);
    }
  }

  async handleCommitInvoice(invoiceId) {
    const res = await this.apiPost(`/shops/${this.shopId}/nopos/invoices/${invoiceId}/commit`);
    if (res.success) {
      alert('✅ Invoice committed! Goods received and stock balances credited to ledger.');
      await this.loadNoPosData();
      await this.refreshAll();
    } else {
      alert(`❌ Error: ${res.error?.message}`);
    }
  }

  // CASH BUDGET REPLENISHMENT (PS-12)
  async loadBudgetReplenishment() {
    const limit = Number(document.getElementById('budgetLimitInput').value) || 5000;
    const res = await this.apiPost(`/shops/${this.shopId}/analytics/budget-replenishment`, { budgetLimit: limit });

    if (!res.success) return;
    const plan = res.data;

    document.getElementById('kpiBudgetCap').textContent = `₹${plan.budgetLimit}`;
    document.getElementById('kpiBudgetAllocated').textContent = `₹${plan.allocatedAmount}`;
    document.getElementById('kpiBudgetRemaining').textContent = `₹${plan.remainingCashBuffer}`;
    document.getElementById('budgetSummaryBanner').textContent = plan.summaryNote;

    const allocTbody = document.getElementById('budgetAllocatedTableBody');
    if (plan.allocatedItems.length > 0) {
      allocTbody.innerHTML = plan.allocatedItems.map(a => `
        <tr>
          <td><strong>${a.productName}</strong></td>
          <td>${a.category}</td>
          <td><strong>${a.allocatedQty}</strong> ${a.unit}</td>
          <td>₹${a.unitCost}</td>
          <td><strong>₹${a.lineCost}</strong></td>
          <td><span style="font-size:0.85rem; color:var(--text-muted);">${a.allocationReason}</span></td>
        </tr>
      `).join('');
    } else {
      allocTbody.innerHTML = '<tr><td colspan="6">No items allocated. Check stock levels or expand cash budget.</td></tr>';
    }

    const defTbody = document.getElementById('budgetDeferredTableBody');
    if (plan.deferredItems.length > 0) {
      defTbody.innerHTML = plan.deferredItems.map(d => `
        <tr>
          <td><strong>${d.productName}</strong></td>
          <td>${d.category}</td>
          <td>${d.neededQty}</td>
          <td>₹${d.unitCost}</td>
          <td>₹${d.estimatedCost}</td>
          <td style="color:var(--danger); font-size:0.85rem;">${d.deferralReason}</td>
        </tr>
      `).join('');
    } else {
      defTbody.innerHTML = '<tr><td colspan="6">✅ No items deferred! All needed replenishment fits within budget.</td></tr>';
    }
  }

  // KHATA & LIQUIDITY CONTEXT (PS-08)
  async loadKhataData() {
    const [liqRes, custRes] = await Promise.all([
      this.apiGet(`/shops/${this.shopId}/khata/liquidity-context`),
      this.apiGet(`/shops/${this.shopId}/khata/customers`)
    ]);

    if (liqRes.success) {
      const liq = liqRes.data;
      document.getElementById('kpiKhataLiquidCash').textContent = `₹${liq.availableLiquidCash}`;
      document.getElementById('kpiKhataReceivables').textContent = `₹${liq.totalUncollectedReceivables}`;
      document.getElementById('kpiKhataSafeCap').textContent = `₹${liq.safeReplenishmentCashCap}`;
      document.getElementById('khataInvariantText').textContent = liq.ownerGuidance;
    }

    const tbody = document.getElementById('khataCustomersTableBody');
    if (custRes.success && custRes.data.length > 0) {
      tbody.innerHTML = custRes.data.map(c => `
        <tr>
          <td><strong>${c.customerName}</strong></td>
          <td>${c.phoneNumber || '-'}</td>
          <td>₹${c.creditLimit}</td>
          <td style="color:${c.currentBalance > 0 ? 'var(--warning)' : 'var(--success)'}; font-weight:700;">₹${c.currentBalance}</td>
          <td><span class="badge ${c.status === 'ACTIVE' ? 'badge-primary' : 'badge-success'}">${c.status}</span></td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="app.showKhataTxModal('${c._id}', 'credit', '${escape(c.customerName)}')">+ Give Credit</button>
            <button class="btn btn-success btn-sm" onclick="app.showKhataTxModal('${c._id}', 'collect', '${escape(c.customerName)}')">💰 Collect Cash</button>
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="6">No customer credit accounts. Click "+ Add Customer Account".</td></tr>';
    }
  }

  showAddKhataCustomerModal() {
    document.getElementById('khataCustomerModal').classList.add('active');
  }

  async handleCreateKhataCustomer(e) {
    e.preventDefault();
    const customerName = document.getElementById('khataModalName').value;
    const phoneNumber = document.getElementById('khataModalPhone').value;
    const creditLimit = Number(document.getElementById('khataModalLimit').value);

    const res = await this.apiPost(`/shops/${this.shopId}/khata/customers`, {
      customerName,
      phoneNumber,
      creditLimit
    });

    if (res.success) {
      alert('✅ Customer Khata account opened!');
      this.closeModals();
      await this.loadKhataData();
    } else {
      alert(`❌ Error: ${res.error?.message}`);
    }
  }

  showKhataTxModal(customerId, type, customerName) {
    document.getElementById('khataTxCustomerId').value = customerId;
    document.getElementById('khataTxType').value = type;
    document.getElementById('khataTxModalTitle').textContent =
      type === 'credit' ? `Give Credit to ${unescape(customerName)}` : `Collect Payment from ${unescape(customerName)}`;
    document.getElementById('khataTxSubmitBtn').textContent =
      type === 'credit' ? 'Record Credit Given' : 'Confirm Cash Collected';
    document.getElementById('khataTxModal').classList.add('active');
  }

  async handleSubmitKhataTx(e) {
    e.preventDefault();
    const customerId = document.getElementById('khataTxCustomerId').value;
    const type = document.getElementById('khataTxType').value;
    const amount = Number(document.getElementById('khataTxAmount').value);
    const notes = document.getElementById('khataTxNotes').value;

    const endpoint = type === 'credit'
      ? `/shops/${this.shopId}/khata/customers/${customerId}/credit`
      : `/shops/${this.shopId}/khata/customers/${customerId}/collect`;

    const res = await this.apiPost(endpoint, { amount, notes, paymentMode: 'CASH' });

    if (res.success) {
      alert(`✅ Transaction recorded! New customer balance: ₹${res.data.currentBalance}`);
      this.closeModals();
      await this.loadKhataData();
      await this.refreshAll();
    } else {
      alert(`❌ Error: ${res.error?.message}`);
    }
  }

  // FESTIVAL SCENARIOS (PS-04)
  async loadFestivalScenarios() {
    const festivalId = document.getElementById('festivalSelect').value || 'diwali';
    const res = await this.apiGet(`/shops/${this.shopId}/analytics/festival-scenarios?festivalId=${festivalId}`);

    if (!res.success) return;
    const data = res.data;

    const scenarios = [
      { name: 'Conservative (+25%)', color: 'var(--success)', item: data.scenarios.conservative },
      { name: 'Moderate (+60%)', color: 'var(--primary)', item: data.scenarios.moderate },
      { name: 'Aggressive (+120%)', color: 'var(--warning)', item: data.scenarios.aggressive }
    ];

    document.getElementById('festivalScenariosGrid').innerHTML = scenarios.map(s => `
      <div class="card" style="border-top: 4px solid ${s.color};">
        <h3 style="font-size: 1.05rem; margin-bottom: 8px;">${s.name}</h3>
        <div style="font-size: 1.4rem; font-weight: 700; color: ${s.color}; margin-bottom: 6px;">
          ₹${s.item.totalIncrementalCapital}
        </div>
        <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 10px;">
          Build capital for ${s.item.skusCount} festive items
        </div>
        <p style="font-size: 0.8rem; color: var(--text-muted);">${s.item.assumptions}</p>
      </div>
    `).join('');

    const tbody = document.getElementById('festivalItemsTableBody');
    const items = data.scenarios.moderate.items || [];
    tbody.innerHTML = items.map(i => `
      <tr>
        <td><strong>${i.productName}</strong></td>
        <td>${i.category}</td>
        <td>${i.currentStock}</td>
        <td>${i.totalFestivalProjectedDemand}</td>
        <td><strong style="color:var(--primary);">+${i.incrementalUnitsToOrder}</strong></td>
        <td>₹${i.estimatedOrderCost}</td>
      </tr>
    `).join('');
  }

  // DEAD STOCK ANALYSIS (PS-01)
  async loadDeadStockAnalysis() {
    const res = await this.apiGet(`/shops/${this.shopId}/analytics/dead-stock-analysis`);
    if (!res.success) return;

    const tbody = document.getElementById('deadStockTableBody');
    const items = res.data.items || [];
    if (items.length > 0) {
      tbody.innerHTML = items.map(item => `
        <tr>
          <td><strong>${item.productName}</strong></td>
          <td>${item.category}</td>
          <td>${item.onHandQty}</td>
          <td><strong>₹${item.tiedCapital}</strong></td>
          <td>
            <span class="badge ${item.ageingBucket === '90+' ? 'badge-danger' : item.ageingBucket === '61-90' ? 'badge-warning' : 'badge-primary'}">
              ${item.ageingBucket} DAYS
            </span>
          </td>
          <td style="font-size:0.85rem; color:var(--text-muted);">${item.actionRecommendation}</td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="6">No inventory items found.</td></tr>';
    }
  }

  // EXPIRY RISKS
  async loadExpiry() {
    const res = await this.apiGet(`/shops/${this.shopId}/analytics/expiry-risks?horizonDays=30`);
    const tbody = document.getElementById('expiryTableBody');
    if (res.success && res.data.length > 0) {
      tbody.innerHTML = res.data.map(e => `
        <tr>
          <td><strong>${e.productName}</strong></td>
          <td>${e.batchCode || 'LOT-DEFAULT'}</td>
          <td>${e.remainingQty} ${e.unit}</td>
          <td>₹${e.tiedCapital}</td>
          <td>${new Date(e.expiryDate).toLocaleDateString()} (${e.daysUntilExpiry}d left)</td>
          <td><span class="badge ${e.status === 'EXPIRED' ? 'badge-danger' : 'badge-warning'}">${e.status}</span></td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="6">✅ No products expiring within 30 days!</td></tr>';
    }
  }

  // REORDER RECOMMENDATIONS
  async loadReplenishment() {
    const res = await this.apiGet(`/shops/${this.shopId}/analytics/reorder-recommendations?windowDays=14`);
    const tbody = document.getElementById('replenishmentTableBody');
    if (res.success && res.data.length > 0) {
      tbody.innerHTML = res.data.map(r => `
        <tr>
          <td><strong>${r.productName}</strong></td>
          <td>${r.currentStock} ${r.unit}</td>
          <td>${r.averageDailyDemand} ${r.unit}/d</td>
          <td>${r.estimatedDaysRemaining} days</td>
          <td><strong style="color:var(--primary);">${r.suggestedReorderQty} ${r.unit}</strong></td>
          <td><span class="badge badge-primary">${r.dataQuality}</span></td>
          <td>
            ${r.needsReorder ? `<button class="btn btn-secondary btn-sm" onclick="app.quickDraftPO('${r.productId}', ${r.suggestedReorderQty})">Draft PO</button>` : `<span style="color:var(--success);">Adequate</span>`}
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="7">No replenishment recommendations available.</td></tr>';
    }
  }

  // PURCHASE ORDERS
  async loadPurchaseOrders() {
    const res = await this.apiGet(`/shops/${this.shopId}/purchase-orders`);
    const tbody = document.getElementById('poTableBody');
    const pos = Array.isArray(res.data) ? res.data : (res.data?.purchaseOrders || res.data?.pos || []);
    if (res.success && pos.length > 0) {
      tbody.innerHTML = pos.map(po => `
        <tr>
          <td><strong>${po.orderNumber}</strong></td>
          <td>${po.supplierId?.name || po.supplierName || 'Distributor'}</td>
          <td>${po.items.length} SKUs</td>
          <td><strong>₹${po.totalCost || po.totalEstimatedCost || 0}</strong></td>
          <td><span class="badge ${po.status === 'APPROVED' ? 'badge-success' : po.status === 'DRAFT' ? 'badge-warning' : 'badge-primary'}">${po.status}</span></td>
          <td>${new Date(po.createdAt).toLocaleDateString()}</td>
          <td>
            ${(po.status === 'DRAFT' || po.status === 'PENDING_APPROVAL') ? `<button class="btn btn-success btn-sm" onclick="app.approvePO('${po._id}')">Approve</button>` : ''}
            ${po.status === 'APPROVED' ? `<button class="btn btn-primary btn-sm" onclick="app.receiveFullPO('${po._id}')">Receive Goods</button>` : ''}
          </td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="7">No purchase orders found. Click "+ Create PO Draft".</td></tr>';
    }
  }

  async approvePO(poId) {
    const res = await this.apiPost(`/shops/${this.shopId}/purchase-orders/${poId}/approve`);
    if (res.success) {
      alert('✅ Purchase order approved by owner!');
      await this.loadPurchaseOrders();
    } else {
      alert(`❌ Approval rejected: ${res.error?.message}`);
    }
  }

  async receiveFullPO(poId) {
    const poRes = await this.apiGet(`/shops/${this.shopId}/purchase-orders/${poId}`);
    if (!poRes.success) return;

    const po = poRes.data;
    const receivedItems = po.items.map(item => ({
      productId: (item.productId?._id || item.productId).toString(),
      quantityReceived: item.requestedQty - (item.receivedQty || 0)
    }));

    const res = await this.apiPost(
      `/shops/${this.shopId}/purchase-orders/${poId}/receive`,
      { receivedItems },
      `recv_${poId}_${Date.now()}`
    );

    if (res.success) {
      alert('✅ Goods received and inventory balances credited to immutable ledger!');
      await this.loadPurchaseOrders();
      await this.refreshAll();
    } else {
      alert(`❌ Receiving failed: ${res.error?.message}`);
    }
  }

  async quickDraftPO(productId, suggestedQty) {
    let suppliersRes = await this.apiGet(`/shops/${this.shopId}/suppliers`);
    let supplierId = suppliersRes.data?.[0]?._id;
    if (!supplierId) {
      const suppCreate = await this.apiPost(`/shops/${this.shopId}/suppliers`, {
        name: 'Balaji FMCG Wholesalers',
        phone: '9876543210',
        leadTimeDays: 2
      });
      if (suppCreate.success) {
        supplierId = suppCreate.data?._id || suppCreate.data?.id;
      }
    }
    const prod = this.products.find(p => p._id === productId);
    const unitPrice = prod?.costPrice || 50;
    const poRes = await this.apiPost(`/shops/${this.shopId}/purchase-orders`, {
      supplierId: supplierId || '60c72b2f9b1d8b2bad8e9999',
      items: [{
        productId,
        requestedQty: Math.max(1, Math.round(suggestedQty)),
        unitPrice
      }]
    });
    if (poRes.success) {
      alert(`✅ Purchase Order Draft created! Order #${poRes.data?.orderNumber || poRes.data?.id || ''}. Check Purchase Orders tab to approve.`);
      await this.loadPurchaseOrders();
    } else {
      alert(`❌ Could not create Draft PO: ${poRes.error?.message}`);
    }
  }

  async showCreatePOModal() {
    const suppSelect = document.getElementById('poModalSupplier');
    const prodSelect = document.getElementById('poModalProduct');
    const res = await this.apiGet(`/shops/${this.shopId}/suppliers`);
    if (res.success && res.data.length > 0) {
      suppSelect.innerHTML = res.data.map(s => `<option value="${s._id}">${s.name}</option>`).join('');
    } else {
      suppSelect.innerHTML = '<option value="">Default FMCG Wholesaler</option>';
    }
    prodSelect.innerHTML = this.products.map(p => `<option value="${p._id}">${p.name} (Cost: ₹${p.costPrice})</option>`).join('');
    if (this.products.length > 0) {
      document.getElementById('poModalUnitPrice').value = this.products[0].costPrice;
    }
    document.getElementById('createPOModal').classList.add('active');
  }

  async handleCreatePODraft(e) {
    e.preventDefault();
    let supplierId = document.getElementById('poModalSupplier').value;
    if (!supplierId) {
      const suppCreate = await this.apiPost(`/shops/${this.shopId}/suppliers`, {
        name: 'Balaji FMCG Wholesalers',
        phone: '9876543210',
        leadTimeDays: 2
      });
      if (suppCreate.success) {
        supplierId = suppCreate.data?._id || suppCreate.data?.id;
      }
    }
    const productId = document.getElementById('poModalProduct').value;
    const requestedQty = parseInt(document.getElementById('poModalQty').value, 10);
    const unitPrice = parseFloat(document.getElementById('poModalUnitPrice').value);

    const res = await this.apiPost(`/shops/${this.shopId}/purchase-orders`, {
      supplierId: supplierId || '60c72b2f9b1d8b2bad8e9999',
      items: [{ productId, requestedQty, unitPrice }]
    });

    if (res.success) {
      alert(`✅ Purchase Order Draft created! Order #${res.data?.orderNumber || res.data?.id || ''}.`);
      this.closeModals();
      await this.loadPurchaseOrders();
    } else {
      alert(`❌ Failed to create draft PO: ${res.error?.message}`);
    }
  }

  showAddSupplierModal() {
    document.getElementById('addSupplierModal').classList.add('active');
  }

  async handleAddSupplier(e) {
    e.preventDefault();
    const name = document.getElementById('suppModalName').value;
    const phone = document.getElementById('suppModalPhone').value;
    const leadTimeDays = parseInt(document.getElementById('suppModalLeadTime').value, 10) || 2;

    const res = await this.apiPost(`/shops/${this.shopId}/suppliers`, {
      name,
      phone,
      leadTimeDays
    });

    if (res.success) {
      alert('✅ Supplier registered successfully!');
      this.closeModals();
      await this.loadSuppliers();
    } else {
      alert(`❌ Failed to register supplier: ${res.error?.message}`);
    }
  }

  // SUPPLIERS
  async loadSuppliers() {
    const res = await this.apiGet(`/shops/${this.shopId}/suppliers`);
    const tbody = document.getElementById('suppliersTableBody');
    if (res.success && res.data.length > 0) {
      tbody.innerHTML = res.data.map(s => `
        <tr>
          <td><strong>${s.name}</strong></td>
          <td>${s.phone || '-'}</td>
          <td>${s.leadTimeDays} days</td>
          <td><span class="badge badge-success">ACTIVE</span></td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="4">No suppliers registered. Click "+ Add Supplier".</td></tr>';
    }
  }

  // AUDIT LEDGER
  async loadAuditMovements() {
    const res = await this.apiGet(`/shops/${this.shopId}/inventory/movements?limit=50`);
    const tbody = document.getElementById('auditMovementsBody');
    if (res.success && res.data.movements.length > 0) {
      tbody.innerHTML = res.data.movements.map(m => `
        <tr>
          <td>${new Date(m.createdAt).toLocaleTimeString()}</td>
          <td>${m.productId?.name || m.productId}</td>
          <td><span class="badge badge-primary">${m.movementType}</span></td>
          <td style="color:${m.quantityDelta > 0 ? 'var(--success)' : 'var(--danger)'}; font-weight:700;">
            ${m.quantityDelta > 0 ? `+${m.quantityDelta}` : m.quantityDelta}
          </td>
          <td>₹${m.unitCost}</td>
          <td>${m.actorId?.name || 'System'}</td>
          <td style="font-size:0.8rem; color:var(--text-muted);">${m.reason || '-'}</td>
        </tr>
      `).join('');
    } else {
      tbody.innerHTML = '<tr><td colspan="7">No ledger movements recorded yet.</td></tr>';
    }
  }

  // AI VOICE ASSISTANT
  async handleSendChatMessage(e) {
    e.preventDefault();
    const input = document.getElementById('chatInput');
    const prompt = input.value.trim();
    if (!prompt) return;

    input.value = '';
    const chatMessages = document.getElementById('chatMessages');
    chatMessages.innerHTML += `<div class="chat-bubble user">${prompt}</div>`;
    chatMessages.scrollTop = chatMessages.scrollHeight;

    const res = await this.apiPost(`/shops/${this.shopId}/agent/chat`, { prompt });
    if (res.success) {
      const formatted = res.data.response.replace(/\n/g, '<br>');
      chatMessages.innerHTML += `
        <div class="chat-bubble assistant">
          ${formatted}
        </div>
      `;
      chatMessages.scrollTop = chatMessages.scrollHeight;
    } else {
      chatMessages.innerHTML += `
        <div class="chat-bubble assistant" style="color:var(--danger);">
          Error executing assistant request: ${res.error?.message}
        </div>
      `;
    }
  }

  toggleVoiceInput() {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser. Please type your query in English or Hindi.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'hi-IN';
    this.recognition.interimResults = false;

    const micBtn = document.getElementById('voiceMicBtn');
    micBtn.style.background = 'var(--danger)';
    micBtn.textContent = '🔴 Listening...';

    this.recognition.onresult = async (event) => {
      const transcript = event.results[0][0].transcript;
      document.getElementById('chatInput').value = transcript;
      micBtn.style.background = '';
      micBtn.textContent = '🎙️ Speak';

      const voiceRes = await this.apiPost(`/shops/${this.shopId}/voice/transcribe-intent`, {
        audioTranscript: transcript,
        language: 'hi-IN'
      });

      if (voiceRes.success) {
        const msg = voiceRes.data.confirmationMessage;
        const chatMessages = document.getElementById('chatMessages');
        chatMessages.innerHTML += `
          <div class="chat-bubble user">🎙️ "${transcript}"</div>
          <div class="chat-bubble assistant">
            <strong>Voice Command Recognized:</strong><br>${msg}
          </div>
        `;
        chatMessages.scrollTop = chatMessages.scrollHeight;
      }
    };

    this.recognition.onend = () => {
      this.isRecordingVoice = false;
      micBtn.style.background = '';
      micBtn.textContent = '🎙️ Speak';
    };

    this.recognition.start();
  }

  showAddProductModal() { document.getElementById('addProductModal').classList.add('active'); }
  closeModals() { document.querySelectorAll('.modal').forEach(m => m.classList.remove('active')); }

  async handleCreateProduct(e) {
    e.preventDefault();
    const name = document.getElementById('modalProdName').value;
    const category = document.getElementById('modalProdCategory').value;
    const unit = document.getElementById('modalProdUnit').value;
    const costPrice = parseFloat(document.getElementById('modalProdCost').value);
    const sellingPrice = parseFloat(document.getElementById('modalProdPrice').value);
    const reorderPoint = parseFloat(document.getElementById('modalProdReorder').value);
    const openingQty = parseFloat(document.getElementById('modalProdOpening').value);

    const res = await this.apiPost(`/shops/${this.shopId}/products`, {
      name,
      category,
      unit,
      costPrice,
      sellingPrice,
      reorderPoint,
      openingStock: openingQty > 0 ? { quantity: openingQty } : undefined
    });

    if (res.success) {
      alert('✅ Product added successfully!');
      this.closeModals();
      await this.refreshAll();
    } else {
      alert(`❌ Error: ${res.error?.message}`);
    }
  }

  showReceiveModal(productId, productName, costPrice) {
    document.getElementById('receiveProductId').value = productId;
    document.getElementById('receiveProductName').value = unescape(productName);
    document.getElementById('receiveCost').value = costPrice;
    document.getElementById('receiveStockModal').classList.add('active');
  }

  async handleDirectReceipt(e) {
    e.preventDefault();
    const productId = document.getElementById('receiveProductId').value;
    const quantity = parseFloat(document.getElementById('receiveQty').value);
    const unitCost = parseFloat(document.getElementById('receiveCost').value);

    const res = await this.apiPost(
      `/shops/${this.shopId}/inventory/receipts`,
      { productId, quantity, unitCost, reason: 'Manual delivery receipt' },
      `recv_${Date.now()}`
    );

    if (res.success) {
      alert('✅ Stock received and inventory ledger updated!');
      this.closeModals();
      await this.refreshAll();
    } else {
      alert(`❌ Receipt error: ${res.error?.message}`);
    }
  }

  async handleCreateSale(e) {
    e.preventDefault();
    const productId = document.getElementById('posProductSelect').value;
    const quantity = parseFloat(document.getElementById('posQuantity').value);
    const paymentMethod = document.getElementById('posPaymentMethod').value;

    const prod = this.products.find(p => p._id === productId);
    const unitPrice = prod ? prod.sellingPrice : 20;

    const res = await this.apiPost(
      `/shops/${this.shopId}/sales`,
      {
        items: [{ productId, quantity, unitPrice }],
        paymentMethod
      },
      `sale_${Date.now()}`
    );

    if (res.success) {
      const amount = res.data.sale?.totalAmount ?? res.data.totalAmount ?? 0;
      alert(`✅ Sale complete! Total: ₹${amount}. Inventory deducted via FEFO.`);
      await this.refreshAll();
    } else {
      alert(`❌ Sale failed: ${res.error?.message}`);
    }
  }

  async showReconcileModal() {
    const res = await this.apiGet(`/shops/${this.shopId}/inventory/reconcile?repair=true`);
    if (res.success) {
      alert(`⚖️ Reconciliation Complete!\n\nStatus: ${res.data.isConsistent ? 'PERFECTLY CONSISTENT' : 'REPAIRED'}\nProducts Checked: ${res.data.productsChecked}\nDiscrepancies: ${res.data.discrepancyCount}`);
      await this.refreshAll();
    }
  }
}

const app = new KiranaApp();
window.app = app;
