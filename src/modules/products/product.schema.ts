import { z } from 'zod';

export const productUnitEnum = z.enum(['PCS', 'KG', 'G', 'L', 'ML', 'PACK', 'BOX']);

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required'),
  brand: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  category: z.string().min(1, 'Category is required'),
  unit: productUnitEnum.default('PCS'),
  costPrice: z.number().min(0, 'Cost price cannot be negative'),
  sellingPrice: z.number().min(0, 'Selling price cannot be negative'),
  reorderPoint: z.number().min(0).default(10),
  targetCoverDays: z.number().min(1).default(7),
  expiryTracked: z.boolean().default(false),
  openingStock: z.object({
    quantity: z.number().min(0),
    batchCode: z.string().optional(),
    expiryDate: z.string().datetime().optional()
  }).optional()
});

export const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  brand: z.string().optional(),
  sku: z.string().optional(),
  barcode: z.string().optional(),
  category: z.string().min(1).optional(),
  unit: productUnitEnum.optional(),
  costPrice: z.number().min(0).optional(),
  sellingPrice: z.number().min(0).optional(),
  reorderPoint: z.number().min(0).optional(),
  targetCoverDays: z.number().min(1).optional(),
  expiryTracked: z.boolean().optional(),
  status: z.enum(['active', 'archived']).optional()
});

export const listProductsQuerySchema = z.object({
  search: z.string().optional(),
  category: z.string().optional(),
  status: z.enum(['active', 'archived']).optional().default('active'),
  limit: z.coerce.number().min(1).max(200).default(50),
  skip: z.coerce.number().min(0).default(0)
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
