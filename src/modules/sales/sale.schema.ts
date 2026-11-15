import { z } from 'zod';

export const saleItemInputSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  quantity: z.number().positive('Quantity must be greater than zero'),
  unitPrice: z.number().min(0, 'Unit price cannot be negative')
});

export const createSaleSchema = z.object({
  items: z.array(saleItemInputSchema).min(1, 'Sale must include at least one item'),
  paymentMethod: z.enum(['CASH', 'UPI', 'CREDIT']).default('CASH'),
  source: z.enum(['POS', 'VOICE', 'SYNC']).default('POS'),
  notes: z.string().optional()
});

export const listSalesQuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  skip: z.coerce.number().min(0).default(0),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type ListSalesQuery = z.infer<typeof listSalesQuerySchema>;
