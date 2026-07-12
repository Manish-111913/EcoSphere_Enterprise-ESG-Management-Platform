export type DataScopeLevel = 'OWN' | 'DEPARTMENT' | 'ALL';

/** Attached to the request by JwtAuthGuard after verification. */
export interface AuthenticatedUser {
  id: string;
  email: string;
  departmentId: string;
  isActive: boolean;
  roleIds: string[];
  roleNames: string[];
  permissions: string[]; // effective "resource:action" keys
}

export interface ResolvedScope {
  level: DataScopeLevel;
  userId: string;
  departmentId: string;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: AuthenticatedUser;
  }
}
