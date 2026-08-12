export interface ILoginResponse {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    branch?: any;
  };
}

export interface ICsrfResponse {
  csrfToken: string;
}

export interface IJwtPayload {
  id: string;
  email: string;
  role: string;
  tokenType?: string;
  jti?: string;
}
