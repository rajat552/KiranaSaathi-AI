import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { KhataCustomer, IKhataCustomer } from './khata.model.js';
import { Sale } from '../sales/sale.model.js';
import { AppError } from '../../common/errors/app-error.js';

export interface LiquidityContext {
  estimatedCashSalesTotal: number;
  totalCollectedKhata: number;
  totalUncollectedReceivables: number;
  overdueReceivablesRisk: number; // receivables older than 30 days
  availableLiquidCash: number;
  safeReplenishmentCashCap: number;
  khataCustomerCount: number;
  liquidityInvariantEnforced: boolean;
  ownerGuidance: string;
}

export class KhataService {
  async createCustomer(
    shopId: string,
    _actorId: string,
    data: {
      customerName: string;
      phoneNumber?: string;
      address?: string;
      creditLimit?: number;
    }
  ): Promise<IKhataCustomer> {
    const shopObjectId = new mongoose.Types.ObjectId(shopId);

    const customer = new KhataCustomer({
      shopId: shopObjectId,
      customerName: data.customerName.trim(),
      phoneNumber: data.phoneNumber?.trim(),
      address: data.address?.trim(),
      creditLimit: data.creditLimit !== undefined ? data.creditLimit : 5000,
      currentBalance: 0,
      entries: []
    });

    await customer.save();
    return customer;
  }

  async getCustomers(shopId: string) {
    return KhataCustomer.find({ shopId: new mongoose.Types.ObjectId(shopId) }).sort({
      currentBalance: -1
    });
  }

  async getCustomer(shopId: string, customerId: string) {
    const customer = await KhataCustomer.findOne({
      _id: new mongoose.Types.ObjectId(customerId),
      shopId: new mongoose.Types.ObjectId(shopId)
    });
    if (!customer) throw AppError.notFound('Khata customer not found');
    return customer;
  }

  async recordCredit(
    shopId: string,
    actorId: string,
    customerId: string,
    data: {
      amount: number;
      notes?: string;
      saleId?: string;
    }
  ) {
    if (data.amount <= 0) throw AppError.badRequest('Credit amount must be greater than zero');

    const customer = await this.getCustomer(shopId, customerId);

    const newBalance = customer.currentBalance + data.amount;
    if (customer.creditLimit > 0 && newBalance > customer.creditLimit) {
      throw AppError.badRequest(
        `Credit limit exceeded. Customer limit: ₹${customer.creditLimit}, requested balance: ₹${newBalance}`
      );
    }

    customer.currentBalance = Math.round(newBalance * 100) / 100;
    customer.lastTransactionAt = new Date();
    customer.entries.push({
      entryId: uuidv4(),
      type: 'CREDIT_GIVEN',
      amount: data.amount,
      notes: data.notes,
      saleId: data.saleId ? new mongoose.Types.ObjectId(data.saleId) : undefined,
      actorId: new mongoose.Types.ObjectId(actorId),
      createdAt: new Date()
    });

    await customer.save();
    return customer;
  }

  async recordCollection(
    shopId: string,
    actorId: string,
    customerId: string,
    data: {
      amount: number;
      paymentMode?: 'CASH' | 'UPI';
      notes?: string;
    }
  ) {
    if (data.amount <= 0) throw AppError.badRequest('Collection amount must be greater than zero');

    const customer = await this.getCustomer(shopId, customerId);

    const newBalance = Math.max(0, customer.currentBalance - data.amount);
    customer.currentBalance = Math.round(newBalance * 100) / 100;
    customer.lastTransactionAt = new Date();
    if (customer.currentBalance === 0) {
      customer.status = 'SETTLED';
    }

    customer.entries.push({
      entryId: uuidv4(),
      type: 'PAYMENT_COLLECTED',
      amount: data.amount,
      notes: data.notes,
      paymentMode: data.paymentMode || 'CASH',
      actorId: new mongoose.Types.ObjectId(actorId),
      createdAt: new Date()
    });

    await customer.save();
    return customer;
  }

  /**
   * PS-08: Invariant Enforcement - Khata uncollected balance is NEVER liquid cash
   */
  async getLiquidityContext(shopId: string): Promise<LiquidityContext> {
    const shopObjectId = new mongoose.Types.ObjectId(shopId);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // 1. Calculate cash sales directly received
    const sales = await Sale.find({ shopId: shopObjectId });
    let estimatedCashSalesTotal = 0;
    for (const sale of sales) {
      if (sale.paymentMethod === 'CASH' || sale.paymentMethod === 'UPI') {
        estimatedCashSalesTotal += sale.totalAmount;
      }
    }

    // 2. Fetch all khata customers
    const customers = await KhataCustomer.find({ shopId: shopObjectId });
    let totalCollectedKhata = 0;
    let totalUncollectedReceivables = 0;
    let overdueReceivablesRisk = 0;

    for (const cust of customers) {
      totalUncollectedReceivables += cust.currentBalance;

      for (const entry of cust.entries) {
        if (entry.type === 'PAYMENT_COLLECTED') {
          totalCollectedKhata += entry.amount;
        }
      }

      // Check if last activity was > 30 days ago and has unpaid balance
      if (cust.currentBalance > 0 && cust.lastTransactionAt && cust.lastTransactionAt < thirtyDaysAgo) {
        overdueReceivablesRisk += cust.currentBalance;
      }
    }

    // Estimated liquid cash currently in register:
    // Cash sales + Collected Khata
    const availableLiquidCash = Math.round((estimatedCashSalesTotal + totalCollectedKhata) * 100) / 100;

    // INVARIANT: Uncollected receivables are STRICTLY EXCLUDED from safe replenishment cash cap
    const safeReplenishmentCashCap = availableLiquidCash;

    return {
      estimatedCashSalesTotal: Math.round(estimatedCashSalesTotal * 100) / 100,
      totalCollectedKhata: Math.round(totalCollectedKhata * 100) / 100,
      totalUncollectedReceivables: Math.round(totalUncollectedReceivables * 100) / 100,
      overdueReceivablesRisk: Math.round(overdueReceivablesRisk * 100) / 100,
      availableLiquidCash,
      safeReplenishmentCashCap,
      khataCustomerCount: customers.length,
      liquidityInvariantEnforced: true,
      ownerGuidance:
        'Core Invariant Enforced: ₹' +
        Math.round(totalUncollectedReceivables) +
        ' in outstanding customer Khata is illiquid credit. It is completely excluded from your safe purchase budget to protect your store from cash shortfalls.'
    };
  }
}

export const khataService = new KhataService();
