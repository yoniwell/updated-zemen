export interface IMembershipResponse {
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
  createdAt: Date;
  updatedAt: Date;
}
