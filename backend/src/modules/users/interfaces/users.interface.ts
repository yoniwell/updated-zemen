export interface IUserResponse {
  id: string;
  name: string;
  email: string;
  role: string;
  branchId: string | null;
  isActive: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
  branch?: {
    id: string;
    name: string;
  } | null;
}

export interface IUsersPaginatedResponse {
  users: IUserResponse[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
