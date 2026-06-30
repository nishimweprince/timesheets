import { Request } from 'express';

export interface RequestUser {
  userId: string;
  membershipId: string;
  organizationId: string;
  email: string;
  permissions: string[];
  sessionId?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: RequestUser;
  correlationId?: string;
}
