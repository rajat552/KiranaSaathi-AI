import mongoose from 'mongoose';
import { connectDatabase, disconnectDatabase } from '../src/config/database.js';
import { User } from '../src/modules/auth/auth.model.js';
import { Shop } from '../src/modules/shops/shop.model.js';
import { Membership } from '../src/modules/shops/membership.model.js';
import { Product } from '../src/modules/products/product.model.js';
import { ProductAlias } from '../src/modules/products/product-alias.model.js';
import { InventoryMovement } from '../src/modules/inventory/inventory-movement.model.js';
import { StockBalance } from '../src/modules/inventory/stock-balance.model.js';
import { InventoryLot } from '../src/modules/inventory/inventory-lot.model.js';
import { Supplier } from '../src/modules/suppliers/supplier.model.js';
import { SupplierQuote } from '../src/modules/suppliers/supplier-quote.model.js';
import { Sale } from '../src/modules/sales/sale.model.js';
import { KhataCustomer } from '../src/modules/khata/khata.model.js';
import { InvoiceIngestion } from '../src/modules/nopos/invoice-ingestion.model.js';
import { StockSnapshot } from '../src/modules/nopos/stock-snapshot.model.js';
import { PooledPurchaseProposal } from '../src/modules/purchasing/pooled-purchase.model.js';
import { hashPassword } from '../src/common/utils/crypto.js';
import { logger } from '../src/config/logger.js';
import { v4 as uuidv4 } from 'uuid';

export async function seedDemoData() {
  logger.info('🌱 Seeding KiranaSaathi AI demo dataset with complete V2.0 features...');
  await connectDatabase();

  // 1. Clean existing collections
  await Promise.all([
    User.deleteMany({}),
    Shop.deleteMany({}),
    Membership.deleteMany({}),
    Product.deleteMany({}),
    ProductAlias.deleteMany({}),
    InventoryMovement.deleteMany({}),
    StockBalance.deleteMany({}),
    InventoryLot.deleteMany({}),
    Supplier.deleteMany({}),
    SupplierQuote.deleteMany({}),
    Sale.deleteMany({}),
    KhataCustomer.deleteMany({}),
    InvoiceIngestion.deleteMany({}),
    StockSnapshot.deleteMany({}),
    PooledPurchaseProposal.deleteMany({})
  ]);

  // 2. Create Owner User
  const ownerPasswordHash = await hashPassword('KiranaPassword2026!');
  const owner = new User({
    name: 'Murugan Pillai',
    email: 'murugan.owner@kirana.in',
    phone: '9840123456',
    passwordHash: ownerPasswordHash
  });
  await owner.save();

  // 3. Create Shop
  const shop = new Shop({
    name: 'Sri Murugan Super Store',
    ownerId: owner._id,
    address: '15 Main Bazaar, Madurai, Tamil Nadu',
    timezone: 'Asia/Kolkata',
    defaultCurrency: 'INR',
    settings: {
      defaultLeadTimeDays: 2,
      defaultSafetyCoverDays: 7,
      lowStockThresholdDefault: 10
    }
  });
  await shop.save();

  // 4. Create Memberships (Owner, Manager, Staff for multi-role demo)
  const membership = new Membership({
    shopId: shop._id,
    userId: owner._id,
    role: 'owner',
    status: 'active'
  });
  await membership.save();

  const managerPasswordHash = await hashPassword('KiranaPassword2026!');
  const manager = new User({
    name: 'Suresh Kumar (Manager)',
    email: 'manager@kirana.in',
    phone: '9840112233',
    passwordHash: managerPasswordHash
  });
  await manager.save();
  await new Membership({
    shopId: shop._id,
    userId: manager._id,
    role: 'manager',
    status: 'active'
  }).save();

  const staffPasswordHash = await hashPassword('KiranaPassword2026!');
  const staff = new User({
    name: 'Ravi Cashier (Staff)',
    email: 'staff@kirana.in',
    phone: '9840998877',
    passwordHash: staffPasswordHash
  });
  await staff.save();
  await new Membership({
    shopId: shop._id,
    userId: staff._id,
    role: 'staff',
    status: 'active'
  }).save();

  // 5. Create Suppliers
  const supHUL = new Supplier({
    shopId: shop._id,
    name: 'Hindustan Unilever Distributor (Madurai Central)',
    phone: '0452-2345678',
    email: 'orders@hul-madurai.com',
    leadTimeDays: 2
  });
  await supHUL.save();

  const supParle = new Supplier({
    shopId: shop._id,
    name: 'Parle & Britannia Agencies',
    phone: '9443123456',
    email: 'agencies@biscuitdist.in',
    leadTimeDays: 3
  });
  await supParle.save();

  // 6. Products Catalog
  const productsData = [
    {
      name: 'Tata Salt Vacuum Evaporated 1kg',
      brand: 'Tata',
      sku: 'SALT-TATA-1KG',
      category: 'Groceries',
      unit: 'PACK' as const,
      costPrice: 21,
      sellingPrice: 28,
      reorderPoint: 20,
      stock: 45,
      aliases: ['tata namak', 'namak packet']
    },
    {
      name: 'Aashirvaad Superior Sharbati Atta 5kg',
      brand: 'ITC Aashirvaad',
      sku: 'ATTA-AASH-5KG',
      category: 'Flour & Grains',
      unit: 'PACK' as const,
      costPrice: 230,
      sellingPrice: 275,
      reorderPoint: 15,
      stock: 22,
      aliases: ['aashirvaad atta', '5kg atta']
    },
    {
      name: 'Parle-G Gold Biscuits 100g',
      brand: 'Parle',
      sku: 'BISC-PARLE-100G',
      category: 'Snacks & Biscuits',
      unit: 'PACK' as const,
      costPrice: 8,
      sellingPrice: 10,
      reorderPoint: 30,
      stock: 6, // Low stock!
      aliases: ['parle g 10 wala', 'parle ji chhota']
    },
    {
      name: 'Fortune Sunlite Refined Sunflower Oil 1L',
      brand: 'Fortune',
      sku: 'OIL-FORT-1L',
      category: 'Edible Oils',
      unit: 'L' as const,
      costPrice: 115,
      sellingPrice: 135,
      reorderPoint: 15,
      stock: 18,
      aliases: ['fortune tel', 'refined oil']
    },
    {
      name: 'Madhur Pure Sugar 1kg',
      brand: 'Madhur',
      sku: 'SUG-MADH-1KG',
      category: 'Groceries',
      unit: 'PACK' as const,
      costPrice: 42,
      sellingPrice: 48,
      reorderPoint: 25,
      stock: 35,
      aliases: ['cheeni packet', 'shakkar']
    },
    {
      name: 'Amul Pure Ghee 1L Tin',
      brand: 'Amul',
      sku: 'GHEE-AMUL-1L',
      category: 'Dairy',
      unit: 'PACK' as const,
      costPrice: 620,
      sellingPrice: 720,
      reorderPoint: 5,
      stock: 4,
      aliases: ['amul ghee', 'desi ghee']
    },
    {
      name: 'Whole Wheat Brown Bread 400g',
      brand: 'Modern',
      sku: 'BRD-MOD-400G',
      category: 'Bakery & Dairy',
      unit: 'PACK' as const,
      costPrice: 32,
      sellingPrice: 42,
      reorderPoint: 10,
      expiryTracked: true,
      stock: 15,
      lotExpiryDays: 4, // Near expiry
      aliases: ['brown bread']
    }
  ];

  const createdProducts: any[] = [];

  for (const p of productsData) {
    const product = new Product({
      shopId: shop._id,
      name: p.name,
      brand: p.brand,
      sku: p.sku,
      category: p.category,
      unit: p.unit,
      costPrice: p.costPrice,
      sellingPrice: p.sellingPrice,
      reorderPoint: p.reorderPoint,
      expiryTracked: p.expiryTracked || false
    });
    await product.save();
    createdProducts.push(product);

    // Save Aliases
    if (p.aliases) {
      for (const aliasText of p.aliases) {
        const alias = new ProductAlias({
          shopId: shop._id,
          productId: product._id,
          aliasText,
          normalizedAlias: aliasText.toLowerCase().trim(),
          language: 'hinglish',
          source: 'manual',
          isConfirmed: true,
          confidenceScore: 1.0
        });
        await alias.save();
      }
    }

    let lotId: mongoose.Types.ObjectId | undefined;
    if (p.expiryTracked && p.lotExpiryDays) {
      const expDate = new Date(Date.now() + p.lotExpiryDays * 24 * 60 * 60 * 1000);
      const lot = new InventoryLot({
        shopId: shop._id,
        productId: product._id,
        batchCode: `BATCH-${Date.now().toString().slice(-4)}`,
        initialQty: p.stock,
        remainingQty: p.stock,
        unitCost: p.costPrice,
        expiryDate: expDate
      });
      await lot.save();
      lotId = lot._id;
    }

    // Opening movement
    const movement = new InventoryMovement({
      shopId: shop._id,
      productId: product._id,
      lotId,
      movementType: 'opening_balance',
      quantityDelta: p.stock,
      unitCost: p.costPrice,
      actorId: owner._id,
      reason: 'Opening stock audit baseline'
    });
    await movement.save();

    // Balance projection
    const balance = new StockBalance({
      shopId: shop._id,
      productId: product._id,
      onHandQty: p.stock,
      reservedQty: 0,
      version: 1
    });
    await balance.save();

    // Create supplier quotes
    if (p.name.includes('Parle')) {
      const quote = new SupplierQuote({
        shopId: shop._id,
        supplierId: supParle._id,
        productId: product._id,
        price: 7.8,
        minOrderQty: 50,
        notes: 'Bulk discount for carton of 100'
      });
      await quote.save();
    }
  }

  // 7. Seed Khata Customers
  const custRamesh = new KhataCustomer({
    shopId: shop._id,
    customerName: 'Ramesh Kumar (Flat 204)',
    phoneNumber: '9840987654',
    creditLimit: 5000,
    currentBalance: 1450,
    lastTransactionAt: new Date(),
    status: 'ACTIVE',
    entries: [
      {
        entryId: uuidv4(),
        type: 'CREDIT_GIVEN',
        amount: 2450,
        notes: 'Monthly ration groceries',
        actorId: owner._id,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
      },
      {
        entryId: uuidv4(),
        type: 'PAYMENT_COLLECTED',
        amount: 1000,
        paymentMode: 'CASH',
        notes: 'Partial cash collection',
        actorId: owner._id,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000)
      }
    ]
  });
  await custRamesh.save();

  // 8. Seed Ingested Invoice in Review Queue
  const inv = new InvoiceIngestion({
    shopId: shop._id,
    uploadedBy: owner._id,
    supplierId: supParle._id,
    invoiceNumber: 'INV-PARLE-891',
    invoiceDate: new Date(),
    totalAmount: 480,
    status: 'VERIFIED',
    lineItems: [
      {
        rawDescription: 'parle g 10 wala',
        matchedProductId: createdProducts[2]._id,
        confidence: 1.0,
        quantity: 60,
        unitCost: 8,
        totalCost: 480,
        batchCode: 'BATCH-PARLE-OCT',
        status: 'verified'
      }
    ]
  });
  await inv.save();

  // 9. Seed Shelf Count Snapshot
  const snap = new StockSnapshot({
    shopId: shop._id,
    performedBy: owner._id,
    notes: 'Sunday opening physical shelf verification',
    items: [
      {
        productId: createdProducts[0]._id,
        countedQty: 45,
        expectedQty: 45,
        varianceQty: 0,
        unitCost: 21
      }
    ],
    totalVarianceValue: 0,
    status: 'applied',
    appliedAt: new Date()
  });
  await snap.save();

  // 10. Seed Pooled Purchase Proposal
  const pool = new PooledPurchaseProposal({
    title: 'Bulk Sugar 50kg Gunny Bag Joint Order',
    category: 'Groceries',
    productDescription: 'Madhur Refined Sugar Grade M-30 50kg gunny bag',
    regularPrice: 2150,
    bulkDiscountPrice: 1980,
    minimumTargetQty: 30,
    totalCommittedQty: 12,
    status: 'OPEN',
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    participatingShops: [
      {
        shopId: shop._id,
        ownerId: owner._id,
        requestedQty: 12,
        approved: true,
        approvedAt: new Date()
      }
    ],
    createdByShopId: shop._id
  });
  await pool.save();

  logger.info('✅ Successfully seeded complete KiranaSaathi AI demo ecosystem!');
}

if (process.argv[1] && process.argv[1].endsWith('seed-demo-data.ts')) {
  seedDemoData()
    .then(() => disconnectDatabase())
    .catch(err => {
      logger.error('Seed failed', err);
      process.exit(1);
    });
}
