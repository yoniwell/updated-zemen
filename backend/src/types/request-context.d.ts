declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      user?: {
        id: string;
        email: string;
        role: string;
        branchId: string | null;
        name: string;
      };
    }
  }
}

export {};
