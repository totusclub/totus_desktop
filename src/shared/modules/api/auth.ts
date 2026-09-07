import {AxiosResponse} from 'axios';
import {post, put} from '../axios';
import {
  ILoginDataApi,
  IRefreshTokenApi,
  IVerificationDataApi,
  ISignUpApi, IVerificationChangeDataApi,
} from '../../types/auth';

interface ILoginAPI {
  loginUser: (data: ILoginDataApi) => Promise<AxiosResponse<any>>;
  verificationCode: (data: IVerificationDataApi) => Promise<AxiosResponse<any>>;
  signupUser: (data: ISignUpApi) => Promise<AxiosResponse<any>>;
  refreshToken: (data: IRefreshTokenApi) => Promise<AxiosResponse<any>>;
}

class AuthorizationAPI implements ILoginAPI {
  loginUser(data: ILoginDataApi): Promise<AxiosResponse<any>> {
    return post('/api/auth/signin', data);
  }

  signupUser(data: ISignUpApi): Promise<AxiosResponse<any>> {
    return post('/api/auth/signup', data);
  }

  verificationCode(data: IVerificationDataApi): Promise<AxiosResponse<any>> {
    return post('/api/auth/verify', data);
  }
  verificationSignup(data: IVerificationDataApi): Promise<AxiosResponse<any>> {
    return post('/api/auth/verify', data);
  }

  refreshToken(data: IRefreshTokenApi): Promise<AxiosResponse<any>> {
    return post('/customer-auth/refresh-token', data);
  }
}

export const authorizationAPI = new AuthorizationAPI();
