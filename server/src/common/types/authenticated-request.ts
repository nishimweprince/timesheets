import { Request } from 'express';

export interface RequestUser {
  userId: string;
  membershipId: string;
  organizationId: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  membershipStatus: 'PENDING' | 'ACTIVE' | 'INACTIVE';
  primaryWorkSiteId: string | null;
  roleNames: string[];
  permissions: string[];
  sessionId?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: RequestUser;
  correlationId?: string;
}
