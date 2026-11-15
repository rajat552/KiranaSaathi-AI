import mongoose from 'mongoose';
import { ProductAlias, IProductAlias } from './product-alias.model.js';
import { Product, IProduct } from './product.model.js';
import { AppError } from '../../common/errors/app-error.js';

export interface ResolveAliasResult {
  resolved: boolean;
  productId?: string;
  productName?: string;
  confidence: number;
  matchType: 'exact_alias' | 'exact_product' | 'fuzzy_alias' | 'fuzzy_product' | 'none';
  requiresConfirmation: boolean;
  candidates: Array<{
    productId: string;
    productName: string;
    score: number;
    matchedAlias?: string;
  }>;
}

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s\u0900-\u097F]/g, ' ') // support alphanumeric, whitespace, and Devanagari Unicode
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Simple Levenshtein distance implementation for string similarity
 */
export function levenshteinSimilarity(s1: string, s2: string): number {
  if (s1 === s2) return 1.0;
  if (!s1.length || !s2.length) return 0.0;

  const len1 = s1.length;
  const len2 = s2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  return 1 - distance / maxLen;
}

/**
 * Token overlap (Jaccard similarity)
 */
export function tokenOverlapScore(s1: string, s2: string): number {
  const tokens1 = new Set(s1.split(' ').filter(Boolean));
  const tokens2 = new Set(s2.split(' ').filter(Boolean));

  if (!tokens1.size || !tokens2.size) return 0;

  let intersection = 0;
  for (const t of tokens1) {
    if (tokens2.has(t)) intersection++;
  }

  const union = new Set([...tokens1, ...tokens2]).size;
  return union === 0 ? 0 : intersection / union;
}

export class ProductAliasService {
  async addAlias(
    shopId: string,
    productId: string,
    data: {
      aliasText: string;
      language?: string;
      source?: 'manual' | 'voice' | 'invoice' | 'system';
      isConfirmed?: boolean;
      confidenceScore?: number;
    }
  ): Promise<IProductAlias> {
    const shopObjectId = new mongoose.Types.ObjectId(shopId);
    const productObjectId = new mongoose.Types.ObjectId(productId);

    const product = await Product.findOne({ _id: productObjectId, shopId: shopObjectId });
    if (!product) throw AppError.notFound('Product not found in this shop');

    const normalized = normalizeText(data.aliasText);
    if (!normalized) throw AppError.badRequest('Alias text cannot be empty');

    const existing = await ProductAlias.findOne({
      shopId: shopObjectId,
      normalizedAlias: normalized
    });

    if (existing) {
      existing.productId = productObjectId;
      existing.aliasText = data.aliasText.trim();
      existing.language = data.language || existing.language;
      existing.source = data.source || existing.source;
      existing.isConfirmed = data.isConfirmed ?? existing.isConfirmed;
      existing.confidenceScore = data.confidenceScore ?? existing.confidenceScore;
      await existing.save();
      return existing;
    }

    const alias = new ProductAlias({
      shopId: shopObjectId,
      productId: productObjectId,
      aliasText: data.aliasText.trim(),
      normalizedAlias: normalized,
      language: data.language || 'hinglish',
      source: data.source || 'manual',
      isConfirmed: data.isConfirmed ?? true,
      confidenceScore: data.confidenceScore ?? 1.0
    });

    await alias.save();
    return alias;
  }

  async getAliasesForProduct(shopId: string, productId: string): Promise<IProductAlias[]> {
    return ProductAlias.find({
      shopId: new mongoose.Types.ObjectId(shopId),
      productId: new mongoose.Types.ObjectId(productId)
    }).sort({ createdAt: -1 });
  }

  async resolveAlias(shopId: string, rawQuery: string): Promise<ResolveAliasResult> {
    const shopObjectId = new mongoose.Types.ObjectId(shopId);
    const normalizedQuery = normalizeText(rawQuery);

    if (!normalizedQuery) {
      return {
        resolved: false,
        confidence: 0,
        matchType: 'none',
        requiresConfirmation: false,
        candidates: []
      };
    }

    // Stage 1: Exact confirmed alias match
    const exactAlias = await ProductAlias.findOne({
      shopId: shopObjectId,
      normalizedAlias: normalizedQuery
    }).populate<{ productId: IProduct }>('productId');

    if (exactAlias && exactAlias.productId) {
      return {
        resolved: true,
        productId: exactAlias.productId._id.toString(),
        productName: exactAlias.productId.name,
        confidence: exactAlias.confidenceScore,
        matchType: 'exact_alias',
        requiresConfirmation: !exactAlias.isConfirmed || exactAlias.confidenceScore < 0.85,
        candidates: [
          {
            productId: exactAlias.productId._id.toString(),
            productName: exactAlias.productId.name,
            score: exactAlias.confidenceScore,
            matchedAlias: exactAlias.aliasText
          }
        ]
      };
    }

    // Stage 2: Direct match against Product name, SKU, or Barcode
    const exactProduct = await Product.findOne({
      shopId: shopObjectId,
      status: 'active',
      $or: [
        { name: { $regex: new RegExp(`^${normalizedQuery}$`, 'i') } },
        { sku: { $regex: new RegExp(`^${normalizedQuery}$`, 'i') } },
        { barcode: rawQuery.trim() }
      ]
    });

    if (exactProduct) {
      return {
        resolved: true,
        productId: exactProduct._id.toString(),
        productName: exactProduct.name,
        confidence: 1.0,
        matchType: 'exact_product',
        requiresConfirmation: false,
        candidates: [
          {
            productId: exactProduct._id.toString(),
            productName: exactProduct.name,
            score: 1.0
          }
        ]
      };
    }

    // Stage 3: Fuzzy matching across known aliases and products
    const [allAliases, allProducts] = await Promise.all([
      ProductAlias.find({ shopId: shopObjectId }).populate<{ productId: IProduct }>('productId'),
      Product.find({ shopId: shopObjectId, status: 'active' })
    ]);

    const scoredCandidates = new Map<string, { productId: string; productName: string; score: number; matchedAlias?: string }>();

    // Check aliases
    for (const item of allAliases) {
      if (!item.productId) continue;
      const pid = item.productId._id.toString();
      const pName = item.productId.name;

      const levScore = levenshteinSimilarity(normalizedQuery, item.normalizedAlias);
      const tokenScore = tokenOverlapScore(normalizedQuery, item.normalizedAlias);
      const compositeScore = Math.max(levScore, tokenScore, (levScore + tokenScore) / 2);

      const existing = scoredCandidates.get(pid);
      if (!existing || compositeScore > existing.score) {
        scoredCandidates.set(pid, {
          productId: pid,
          productName: pName,
          score: compositeScore,
          matchedAlias: item.aliasText
        });
      }
    }

    // Check product names and brands
    for (const prod of allProducts) {
      const pid = prod._id.toString();
      const normName = normalizeText(prod.name);
      const normBrand = prod.brand ? normalizeText(prod.brand) : '';
      const combined = `${normBrand} ${normName}`.trim();

      const levName = levenshteinSimilarity(normalizedQuery, normName);
      const tokenName = tokenOverlapScore(normalizedQuery, normName);
      const levComb = levenshteinSimilarity(normalizedQuery, combined);
      const tokenComb = tokenOverlapScore(normalizedQuery, combined);

      const bestProdScore = Math.max(levName, tokenName, levComb, tokenComb);

      const existing = scoredCandidates.get(pid);
      if (!existing || bestProdScore > existing.score) {
        scoredCandidates.set(pid, {
          productId: pid,
          productName: prod.name,
          score: bestProdScore
        });
      }
    }

    const sorted = Array.from(scoredCandidates.values())
      .filter((c) => c.score >= 0.40)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    if (sorted.length === 0) {
      return {
        resolved: false,
        confidence: 0,
        matchType: 'none',
        requiresConfirmation: false,
        candidates: []
      };
    }

    const top = sorted[0];
    const second = sorted[1];
    const isAmbiguous = second && Math.abs(top.score - second.score) < 0.15;
    const isHighConfidence = top.score >= 0.85 && !isAmbiguous;

    return {
      resolved: true,
      productId: top.productId,
      productName: top.productName,
      confidence: Math.round(top.score * 100) / 100,
      matchType: top.matchedAlias ? 'fuzzy_alias' : 'fuzzy_product',
      requiresConfirmation: !isHighConfidence,
      candidates: sorted
    };
  }

  async confirmAlias(shopId: string, aliasId: string, productId?: string) {
    const shopObjectId = new mongoose.Types.ObjectId(shopId);
    const alias = await ProductAlias.findOne({
      _id: new mongoose.Types.ObjectId(aliasId),
      shopId: shopObjectId
    });

    if (!alias) throw AppError.notFound('Alias not found');

    if (productId) {
      alias.productId = new mongoose.Types.ObjectId(productId);
    }
    alias.isConfirmed = true;
    alias.confidenceScore = 1.0;
    await alias.save();
    return alias;
  }
}

export const productAliasService = new ProductAliasService();
