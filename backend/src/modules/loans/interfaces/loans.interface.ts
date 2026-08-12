export interface ILoanResponse {
  id: string;
  applicant: {
    id: string;
    firstName: string;
    fathersName: string | null;
    grandfathersName: string | null;
    phone: string;
    email: string | null;
  };
  branch: {
    id: string;
    name: string;
  } | null;
  status: string;
  trackingNumber: string;
  amount: number;
  purpose: string | null;
  createdAt: Date;
  updatedAt: Date;
}
