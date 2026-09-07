export enum ELoginDataType {
  email = 'email',
  phone = 'phone',
}

export type AuthUser = {
  id?: string | number;
  name?: string;
  email?: string;
  loyalty_id?: string;
  loyaltyId?: string;
  access?: number | boolean;
  [key: string]: unknown;
};

export interface ILoginDataApi {
  type?: ELoginDataType | string;
  phone?: string;
  email?: string;
  'smart-token'?: string;
  smartToken?: string;
}

export interface IVerificationDataApi {
  email: string;
  code: string | number;
}

export interface IVerificationChangeDataApi {
  token: string;
}

export interface ISignUpApi {
  type?: ELoginDataType | string;
  email: string;
  phone?: string;
  name: string;
  l_name?: string;
  cityId?: string;
  birthDate?: string;
  'smart-token'?: string;
  smartToken?: string;
}

export interface IRefreshTokenApi {
  accessToken: string;
  refreshToken: string;
}
