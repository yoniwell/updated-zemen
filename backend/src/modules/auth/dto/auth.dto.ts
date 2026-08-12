export interface LoginDto {
  email: string;
  password?: string;
  rememberDevice?: boolean;
}

export interface InviteAcceptDto {
  token: string;
  password?: string;
}

export interface VerifyEmailDto {
  verificationToken?: string;
}
