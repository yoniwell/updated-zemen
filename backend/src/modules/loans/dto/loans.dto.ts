export interface ApplyLoanDto {
  firstName: string;
  fathersName?: string;
  grandfathersName?: string;
  membershipNo?: string;
  phone: string;
  email?: string;
  branchId?: string;
  idType?: string;
  idNumber?: string;
  maritalStatus?: string;
  
  loanType?: string;
  amount: number;
  tenure?: number;
  
  collateralType?: string;
  collateralDesc?: string;
}

export interface UpdateLoanStatusDto {
  status: string;
  notes?: string;
}

export interface AssignLoanDto {
  assigneeId: string;
}

export interface UpdateLoanDto {
  firstName?: string;
  fathersName?: string;
  grandfathersName?: string;
  phone?: string;
  email?: string;
  branchId?: string;
  preferredBranch?: string;
  amount?: number;
  durationMonths?: number;
}

export interface UploadDocumentDto {
  loanId: string;
  category: string;
  originalName: string;
  storedName: string;
  mimeType: string;
  size: number;
}

export interface VerifyDocumentDto {
  status: string;
  rejectionReason?: string;
}
