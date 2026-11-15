import { z } from 'zod';

export const poLineItemInputSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  requestedQty: z.number().int().positive('Quantity must be an integer >= 1'),
  unitPrice: z.number().min(0, 'Unit price cannot be negative')
});

export const createPODraftSchema = z.object({
  supplierId: z.string().min(1, 'Supplier ID is required'),
  items: z.array(poLineItemInputSchema).min(1, 'At least one item is required in the purchase order')
});

export const rejectPOSchema = z.object({
  reason: z.string().min(3, 'Rejection reason is required')
});

export const receivePOItemsSchema = z.object({
  receivedItems: z.array(
    z.object({
      productId: z.string().min(1),
      quantityReceived: z.number().positive(),
      batchCode: z.string().optional(),
      expiryDate: z.string().datetime().optional()
    })
  ).min(1, 'At least one received item required')
});

export type CreatePODraftInput = z.infer<typeof createPODraftSchema>;
export type RejectPOInput = z.infer<typeof rejectPOSchema>;
export type ReceivePOItemsInput = z.infer<typeof receivePOItemsSchema>;
