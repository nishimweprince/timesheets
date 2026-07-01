import { Request } from 'express';

export interface RequestUser {
  userId: string;
  membershipId: string;
  organizationId: string;
  organization?: {
    id: string;
    name: string;
    defaultTimezone: string;
  };
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  membershipStatus: 'PENDING' | 'ACTIVE' | 'INACTIVE';
  primaryWorkSiteId: string | null;
  primaryWorkSite?: {
    id: string;
    name: string;
    timezone: string;
  } | null;
  roleNames: string[];
  permissions: string[];
  sessionId?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: RequestUser;
  correlationId?: string;
}
