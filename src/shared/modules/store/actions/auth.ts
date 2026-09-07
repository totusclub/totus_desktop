import {createAsyncThunk} from '@reduxjs/toolkit';
import {authorizationAPI} from '../../api/auth.ts';
import {
  ILoginDataApi,
  IRefreshTokenApi,
  ISignUpApi,
  IVerificationDataApi,
} from '../types/auth.ts';

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async (loginData: ILoginDataApi, thunkAPI) => {
    try {
      const response = await authorizationAPI.loginUser(loginData);
      console.log('response', response.data)
      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const verifyCode = createAsyncThunk(
  'auth/verifyCode',
  async (verificationData: IVerificationDataApi, thunkAPI) => {
    // Send code as string (backend expects string format like "1111")
    const requestData = {
      ...verificationData,
      code: typeof verificationData.code === 'number' 
        ? String(verificationData.code) 
        : verificationData.code,
    };
    
    try {
      const response = await authorizationAPI.verificationCode(
        requestData,
      );
      
      // Validate response structure - check for auth field like web code
      if (!response.data) {
        throw new Error('No data received from server');
      }
      
      // Check if auth is true (like web code: if(data.auth))
      if (!response.data.auth) {
        throw new Error('Verification failed');
      }
      
      // Return the original response data (like web code expects auth and authToken)
      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response?.data || error.message);
    }
  },
);

export const refreshToken = createAsyncThunk(
  'auth/refreshToken',
  async (tokenData: IRefreshTokenApi, thunkAPI) => {
    try {
      const response = await authorizationAPI.refreshToken(tokenData);
      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  },
);
export const signupUser = createAsyncThunk(
  'auth/signup',
  async (data: ISignUpApi, thunkAPI) => {
    try {
      const response = await authorizationAPI.signupUser(data);
      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response?.data || error.message);
    }
  },
);
export const verificationSignup = createAsyncThunk(
  'customer-auth/sign-up',
  async (data: IVerificationDataApi, thunkAPI) => {
    try {
      const response = await authorizationAPI.verificationSignup(data);
      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response.data);
    }
  },
);
