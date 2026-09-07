// Desktop: копия modules/axios из totus_APP без Crashlytics/VoIP-cleanup.
import axios, {AxiosError, AxiosResponse} from 'axios';
import {store} from '../store';
import {jwtDecode} from 'jwt-decode';
import {logoutReducer, updateTokens} from '../store/slices/auth';

export const instance = axios.create({
  // baseURL: 'https://api.totus.club',
  baseURL: 'https://api.totus.club',
});

function summarizeApiPayload(data: unknown): unknown {
  if (!data || typeof data !== 'object') {
    return data;
  }
  const record = data as Record<string, unknown>;
  if (Array.isArray(record.hotels)) {
    return {
      ...record,
      hotels: `[${record.hotels.length} hotels]`,
    };
  }
  return data;
}

instance.interceptors.request.use(
    async function (config) {
        const method = (config.method ?? 'get').toUpperCase();
        const path = config.url ?? '';
        console.log('[API Request]', method, path, {
          params: config.params,
          data: config.data,
        });
        // Do not try to refresh when we are already calling the refresh endpoint
        const isRefreshCall =
            typeof config.url === 'string' &&
            config.url.includes('/customer-auth/refresh-token');

        if (!isRefreshCall) {
            const token = await checkRefreshToken();
            if (token) {
                // AxiosRequestHeaders is a special type; use a safe cast when initializing
                if (!config.headers) {
                    config.headers = {} as any;
                }
                (config.headers as any).Authorization = `Bearer ${token}`;
            }
        }

        return config;
    },
)



instance.interceptors.response.use(
  res => {
    const path = res.config.url ?? '';
    console.log('[API Response]', path, summarizeApiPayload(res.data));
    return res;
  },
  (err: AxiosError) => {
    const status = err.response?.status;
    const url = err.config?.url ?? 'unknown';
    const method = (err.config?.method ?? 'get').toUpperCase();
    console.warn('[API Error]', method, url, status, err.response?.data ?? err.message);
    return Promise.reject(err);
  },
);

export const post = <T>(
  url: string,
  body: any,
  headers?: Record<string, string>,
): Promise<AxiosResponse<T>> => {
  const config = {
    headers: headers || {},
  };
  return instance.post<T>(url, body, config);
};

export const get = <T>(
  url: string,
  params?: Record<string, any>,
): Promise<AxiosResponse<T>> => {
  return instance.get<T>(url, {params});
};
export const put = <T>(
  url: string,
  body: any,
  headers?: Record<string, string>,
): Promise<AxiosResponse<T>> => {
  const config = {
    headers: headers || {},
  };
  return instance.put<T>(url, body, config);
};

export const del = <T>(
  url: string,
  body?: any,
  headers?: Record<string, string>,
): Promise<AxiosResponse<T>> => {
  const config = {
    headers: headers || {},
    body: body,
  };
  return instance.delete<T>(url, config);
};

const checkRefreshToken = async () => {
  const state = store.getState();
  let accessToken = state.auth.accessToken;
  let refreshToken = state.auth.refreshToken;
  if (accessToken) {
    try {
      const decoded = jwtDecode<{exp: number}>(accessToken);
      const currentTime = Math.floor(Date.now() / 1000);
      if (decoded.exp <= currentTime) {
        const response = await instance.post('/customer-auth/refresh-token', {
          accessToken,
          refreshToken,
        });
        accessToken = response.data.accessToken;
        refreshToken = response.data.refreshToken;
        store.dispatch(updateTokens({accessToken, refreshToken}));
        // console.log('New access token fetched');
      } else {
        // console.log('Access token is still valid.');
      }
    } catch (error) {
      // Clean up VoIP/call state before logout (e.g. token expired = implicit logout)
      console.warn('Auth: token refresh failed — logging out');
      store.dispatch(logoutReducer());
      // console.error('Error decoding or refreshing token:', error);
    }
  }
  return accessToken;
};
