import { z } from 'zod';

export const createShopSchema = z.object({
  name: z.string().min(2, 'Shop name must be at least 2 characters'),
  address: z.string().optional(),
  timezone: z.string().default('Asia/Kolkata'),
  defaultCurrency: z.string().default('INR'),
  settings: z.object({
    defaultLeadTimeDays: z.number().min(1).default(3),
    defaultSafetyCoverDays: z.number().min(1).default(7),
    lowStockThresholdDefault: z.number().min(1).default(10)
  }).optional()
});

export const addMemberSchema = z.object({
  emailOrPhone: z.string().min(1, 'Email or phone of user to add is required'),
  role: z.enum(['manager', 'staff'])
});

export type CreateShopInput = z.infer<typeof createShopSchema>;
export type AddMemberInput = z.infer<typeof addMemberSchema>;
