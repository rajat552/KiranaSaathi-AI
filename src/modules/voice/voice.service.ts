import mongoose from 'mongoose';
import { Product } from '../products/product.model.js';
import { StockBalance } from '../inventory/stock-balance.model.js';
import { AppError } from '../../common/errors/app-error.js';

export interface VoiceCommandResult {
  intent: 'RECORD_SALE' | 'CHECK_STOCK' | 'RECEIVE_STOCK' | 'UNCLEAR';
  recognizedText: string;
  confidence: number;
  extractedData?: {
    productName?: string;
    productId?: string;
    quantity?: number;
    unit?: string;
    unitPrice?: number;
    currentStock?: number;
  };
  requiresConfirmation: boolean;
  confirmationMessage: string;
  ambiguousMatches?: { id: string; name: string }[];
}

export class VoiceService {
  async parseVoiceCommand(shopId: string, transcript: string): Promise<VoiceCommandResult> {
    const shopObjectId = new mongoose.Types.ObjectId(shopId);
    const text = transcript.trim();
    const lower = text.toLowerCase();

    // 1. Detect Intent
    let intent: 'RECORD_SALE' | 'CHECK_STOCK' | 'RECEIVE_STOCK' | 'UNCLEAR' = 'UNCLEAR';

    if (
      lower.includes('becha') ||
      lower.includes('sold') ||
      lower.includes('sale') ||
      lower.includes('bika') ||
      lower.includes('sell')
    ) {
      intent = 'RECORD_SALE';
    } else if (
      lower.includes('aaya') ||
      lower.includes('received') ||
      lower.includes('delivery') ||
      lower.includes('receive') ||
      lower.includes('stock in')
    ) {
      intent = 'RECEIVE_STOCK';
    } else if (
      lower.includes('stock kitna') ||
      lower.includes('kitna bacha') ||
      lower.includes('check stock') ||
      lower.includes('how much') ||
      lower.includes('inventory')
    ) {
      intent = 'CHECK_STOCK';
    }

    if (intent === 'UNCLEAR') {
      return {
        intent: 'UNCLEAR',
        recognizedText: text,
        confidence: 0.2,
        requiresConfirmation: true,
        confirmationMessage: `Could not determine your command intent from "${text}". Please try saying e.g. "Sold 2 packet Parle-G" or "Stock kitna hai Tata Salt ka".`
      };
    }

    // 2. Extract Quantity
    const qtyMatch = text.match(/\b(\d+(\.\d+)?)\b/);
    const quantity = qtyMatch ? parseFloat(qtyMatch[1]) : 1;

    // 3. Search Products in catalogue
    const allProducts = await Product.find({ shopId: shopObjectId, status: 'active' });
    const matchingProducts = allProducts.filter(p => {
      const pName = p.name.toLowerCase();
      const pBrand = (p.brand || '').toLowerCase();
      return lower.includes(pName) || pName.split(' ').some(word => word.length > 2 && lower.includes(word)) || (pBrand && lower.includes(pBrand));
    });

    if (matchingProducts.length === 0) {
      return {
        intent,
        recognizedText: text,
        confidence: 0.4,
        requiresConfirmation: true,
        confirmationMessage: `I understood you want to ${intent.toLowerCase().replace('_', ' ')}, but could not find a matching product in your catalogue for "${text}". Please verify the product name.`
      };
    }

    if (matchingProducts.length > 1) {
      return {
        intent,
        recognizedText: text,
        confidence: 0.6,
        requiresConfirmation: true,
        ambiguousMatches: matchingProducts.map(p => ({ id: p._id.toString(), name: p.name })),
        confirmationMessage: `Found ${matchingProducts.length} possible matching products: ${matchingProducts.map(p => `"${p.name}"`).join(', ')}. Please specify which product you meant.`
      };
    }

    // Exactly one matching product found
    const targetProduct = matchingProducts[0];
    const balance = await StockBalance.findOne({
      shopId: shopObjectId,
      productId: targetProduct._id
    });
    const currentStock = balance ? balance.onHandQty : 0;

    let confirmationMessage = '';
    if (intent === 'RECORD_SALE') {
      confirmationMessage = `Confirm recording sale: ${quantity} ${targetProduct.unit} of "${targetProduct.name}" at ₹${targetProduct.sellingPrice} each (Total: ₹${quantity * targetProduct.sellingPrice})? Current stock is ${currentStock} ${targetProduct.unit}.`;
    } else if (intent === 'RECEIVE_STOCK') {
      confirmationMessage = `Confirm receiving delivery: ${quantity} ${targetProduct.unit} of "${targetProduct.name}" at unit cost ₹${targetProduct.costPrice}?`;
    } else {
      confirmationMessage = `Current stock for "${targetProduct.name}" is ${currentStock} ${targetProduct.unit} (Reorder point: ${targetProduct.reorderPoint} ${targetProduct.unit}).`;
    }

    return {
      intent,
      recognizedText: text,
      confidence: 0.92,
      extractedData: {
        productId: targetProduct._id.toString(),
        productName: targetProduct.name,
        quantity,
        unit: targetProduct.unit,
        unitPrice: intent === 'RECORD_SALE' ? targetProduct.sellingPrice : targetProduct.costPrice,
        currentStock
      },
      requiresConfirmation: intent !== 'CHECK_STOCK',
      confirmationMessage
    };
  }
}

export const voiceService = new VoiceService();
