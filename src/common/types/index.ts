export type Role = 'owner' | 'manager' | 'staff';

export interface AuthUser {
  userId: string;
  email?: string;
  phone?: string;
  name: string;
}

export interface TenantContext {
  shopId: string;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: AuthUser;
      shopContext?: TenantContext;
      idempotencyKey?: string;
    }
  }
}
