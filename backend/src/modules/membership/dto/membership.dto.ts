export interface ApplyMembershipDto {
  firstName: string;
  fathersName?: string;
  grandfathersName?: string;
  phone: string;
  email?: string;
  branchId?: string;
  idType?: string;
  idNumber?: string;
  // Account details
  membershipPaymentAmount?: number;
  savingType?: string;
  savingPaymentAmount?: number;
  savingTransactionRef?: string;
}

export interface UpdateMembershipStatusDto {
  status: string;
  notes?: string;
}

export interface AssignMembershipDto {
  assigneeId: string;
}

export interface UpdateMembershipDto {
  firstName?: string;
  fathersName?: string;
  grandfathersName?: string;
  phone?: string;
  email?: string;
  branchId?: string;
  preferredBranch?: string;
  membershipPaymentAmount?: number;
  savingType?: string;
  savingPaymentAmount?: number;
  savingTransactionRef?: string;
}

export interface UploadDocumentDto {
  membershipId: string;
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
