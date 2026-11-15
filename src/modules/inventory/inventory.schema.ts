import { z } from 'zod';

export const stockReceiptSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().positive('Quantity must be greater than zero'),
  unitCost: z.number().min(0, 'Unit cost cannot be negative'),
  batchCode: z.string().optional(),
  expiryDate: z.string().datetime().optional(),
  supplierId: z.string().optional(),
  referenceId: z.string().optional(),
  reason: z.string().optional()
});

export const stockAdjustmentSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  adjustmentType: z.enum(['manual_adjustment', 'wastage', 'supplier_return', 'customer_return']),
  quantityDelta: z.number().refine(val => val !== 0, 'Quantity delta cannot be zero'),
  reason: z.string().min(3, 'A clear reason is required for adjustments'),
  lotId: z.string().optional()
});

export const openingBalanceSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().min(0, 'Quantity cannot be negative'),
  unitCost: z.number().min(0).default(0),
  batchCode: z.string().optional(),
  expiryDate: z.string().datetime().optional()
});

export const listMovementsQuerySchema = z.object({
  productId: z.string().optional(),
  movementType: z.string().optional(),
  limit: z.coerce.number().min(1).max(200).default(50),
  skip: z.coerce.number().min(0).default(0)
});

export type StockReceiptInput = z.infer<typeof stockReceiptSchema>;
export type StockAdjustmentInput = z.infer<typeof stockAdjustmentSchema>;
export type OpeningBalanceInput = z.infer<typeof openingBalanceSchema>;
export type ListMovementsQuery = z.infer<typeof listMovementsQuerySchema>;
