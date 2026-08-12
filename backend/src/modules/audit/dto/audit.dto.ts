export interface AuditQueryDto {
  page?: number;
  limit?: number;
  action?: string;
  userId?: string;
  targetType?: string;
  startDate?: string;
  endDate?: string;
}
