import mongoose from 'mongoose';
import { Supplier, ISupplier } from './supplier.model.js';
import { SupplierQuote, ISupplierQuote } from './supplier-quote.model.js';
import { Product } from '../products/product.model.js';
import { CreateSupplierInput, RecordQuoteInput } from './supplier.schema.js';
import { AppError } from '../../common/errors/app-error.js';

export class SupplierService {
  async createSupplier(shopId: string, input: CreateSupplierInput) {
    const shopObjectId = new mongoose.Types.ObjectId(shopId);
    const supplier = new Supplier({
      shopId: shopObjectId,
      name: input.name,
      phone: input.phone,
      email: input.email,
      leadTimeDays: input.leadTimeDays
    });
    await supplier.save();
    return supplier;
  }

  async listSuppliers(shopId: string) {
    const suppliers = await Supplier.find({
      shopId: new mongoose.Types.ObjectId(shopId),
      status: 'active'
    }).sort({ name: 1 });
    return suppliers;
  }

  async recordQuote(shopId: string, supplierId: string, input: RecordQuoteInput) {
    const shopObjectId = new mongoose.Types.ObjectId(shopId);
    const supplierObjectId = new mongoose.Types.ObjectId(supplierId);
    const productObjectId = new mongoose.Types.ObjectId(input.productId);

    const supplier = await Supplier.findOne({ _id: supplierObjectId, shopId: shopObjectId });
    if (!supplier) throw AppError.notFound('Supplier not found');

    const product = await Product.findOne({ _id: productObjectId, shopId: shopObjectId });
    if (!product) throw AppError.notFound('Product not found');

    const quote = new SupplierQuote({
      shopId: shopObjectId,
      supplierId: supplierObjectId,
      productId: productObjectId,
      price: input.price,
      minOrderQty: input.minOrderQty,
      notes: input.notes
    });

    await quote.save();
    return quote;
  }

  async compareQuotesForProduct(shopId: string, productId: string) {
    const shopObjectId = new mongoose.Types.ObjectId(shopId);
    const productObjectId = new mongoose.Types.ObjectId(productId);

    const product = await Product.findOne({ _id: productObjectId, shopId: shopObjectId });
    if (!product) throw AppError.notFound('Product not found');

    const quotes = await SupplierQuote.find({
      shopId: shopObjectId,
      productId: productObjectId
    })
      .populate('supplierId', 'name leadTimeDays phone')
      .sort({ price: 1, observedAt: -1 });

    const comparison = quotes.map(q => {
      const sup = q.supplierId as any;
      return {
        quoteId: q._id.toString(),
        supplierId: sup?._id?.toString() || q.supplierId.toString(),
        supplierName: sup?.name || 'Unknown Supplier',
        leadTimeDays: sup?.leadTimeDays || 3,
        phone: sup?.phone,
        quotedPrice: q.price,
        minOrderQty: q.minOrderQty,
        observedAt: q.observedAt,
        notes: q.notes
      };
    });

    return {
      productId: product._id.toString(),
      productName: product.name,
      currentCostPrice: product.costPrice,
      quotesAvailable: comparison.length,
      bestPrice: comparison.length > 0 ? comparison[0].quotedPrice : null,
      bestSupplier: comparison.length > 0 ? comparison[0].supplierName : null,
      quotes: comparison
    };
  }
}

export const supplierService = new SupplierService();
