import { z } from 'zod';

export const createSupplierSchema = z.object({
  name: z.string().min(2, 'Supplier name is required'),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  leadTimeDays: z.number().min(1).default(3)
});

export const recordQuoteSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  price: z.number().positive('Quote price must be greater than zero'),
  minOrderQty: z.number().min(1).default(1),
  notes: z.string().optional()
});

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
export type RecordQuoteInput = z.infer<typeof recordQuoteSchema>;
