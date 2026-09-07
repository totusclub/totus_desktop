export enum ELoginDataType {
  email = 'EMAIL',
  phone = 'PHONE',
}

export interface ILoginDataApi {
  type?: ELoginDataType | string;
  phone?: string;
  email?: string;
  'smart-token'?: string;
  smartToken?: string;
}

export interface IVerificationDataApi {
  email: string;
  code: string | number; // Code can be string or number
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
