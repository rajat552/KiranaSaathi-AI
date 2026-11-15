import mongoose from 'mongoose';
import { Product, IProduct } from './product.model.js';
import { CreateProductInput, UpdateProductInput, ListProductsQuery } from './product.schema.js';
import { inventoryService } from '../inventory/inventory.service.js';
import { AppError } from '../../common/errors/app-error.js';

export class ProductService {
  async createProduct(shopId: string, actorId: string, input: CreateProductInput) {
    const shopObjectId = new mongoose.Types.ObjectId(shopId);

    // Uniqueness validation for SKU and Barcode within the shop
    if (input.sku) {
      const existingSku = await Product.findOne({ shopId: shopObjectId, sku: input.sku });
      if (existingSku) throw AppError.conflict(`Product with SKU "${input.sku}" already exists in this shop`);
    }

    if (input.barcode) {
      const existingBarcode = await Product.findOne({ shopId: shopObjectId, barcode: input.barcode });
      if (existingBarcode) throw AppError.conflict(`Product with Barcode "${input.barcode}" already exists in this shop`);
    }

    const product = new Product({
      shopId: shopObjectId,
      name: input.name,
      brand: input.brand,
      sku: input.sku,
      barcode: input.barcode,
      category: input.category,
      unit: input.unit,
      costPrice: input.costPrice,
      sellingPrice: input.sellingPrice,
      reorderPoint: input.reorderPoint,
      targetCoverDays: input.targetCoverDays,
      expiryTracked: input.expiryTracked
    });

    await product.save();

    // If opening stock is specified, record it
    if (input.openingStock && input.openingStock.quantity > 0) {
      await inventoryService.setOpeningBalance(shopId, actorId, {
        productId: product._id.toString(),
        quantity: input.openingStock.quantity,
        unitCost: input.costPrice,
        batchCode: input.openingStock.batchCode,
        expiryDate: input.openingStock.expiryDate
      });
    }

    return product;
  }

  async getProduct(shopId: string, productId: string) {
    const product = await Product.findOne({
      _id: new mongoose.Types.ObjectId(productId),
      shopId: new mongoose.Types.ObjectId(shopId)
    });
    if (!product) throw AppError.notFound('Product not found in this shop');
    return product;
  }

  async updateProduct(shopId: string, productId: string, input: UpdateProductInput) {
    const productObjectId = new mongoose.Types.ObjectId(productId);
    const shopObjectId = new mongoose.Types.ObjectId(shopId);

    const product = await Product.findOne({ _id: productObjectId, shopId: shopObjectId });
    if (!product) throw AppError.notFound('Product not found in this shop');

    if (input.sku && input.sku !== product.sku) {
      const existingSku = await Product.findOne({ shopId: shopObjectId, sku: input.sku });
      if (existingSku) throw AppError.conflict(`Product with SKU "${input.sku}" already exists`);
    }

    if (input.barcode && input.barcode !== product.barcode) {
      const existingBarcode = await Product.findOne({ shopId: shopObjectId, barcode: input.barcode });
      if (existingBarcode) throw AppError.conflict(`Product with Barcode "${input.barcode}" already exists`);
    }

    Object.assign(product, input);
    await product.save();
    return product;
  }

  async listProducts(shopId: string, query: ListProductsQuery) {
    const filter: Record<string, unknown> = {
      shopId: new mongoose.Types.ObjectId(shopId),
      status: query.status
    };

    if (query.category) {
      filter.category = query.category;
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search, 'i');
      filter.$or = [
        { name: searchRegex },
        { brand: searchRegex },
        { sku: searchRegex },
        { barcode: searchRegex }
      ];
    }

    const [products, total] = await Promise.all([
      Product.find(filter).skip(query.skip).limit(query.limit).sort({ name: 1 }),
      Product.countDocuments(filter)
    ]);

    return { products, total, limit: query.limit, skip: query.skip };
  }
}

export const productService = new ProductService();
