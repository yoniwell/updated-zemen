export interface IAuditLogResponse {
  id: string;
  userId: string | null;
  user: { name: string; email: string } | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}
