import {createSlice} from '@reduxjs/toolkit';
import {
  loginUser,
  refreshToken,
  verifyCode,
  signupUser,
  verificationSignup,
} from '../actions/auth.ts';
import {jwtDecode} from 'jwt-decode';

const initialState = {
  userId: null,
  user: null,
  token: null,
  accessToken: null,
  refreshToken: null,
  loading: false,
  error: null,
  fullAuth: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setAuth(state, action) {
      state.token = action.payload.token;
      state.user = action.payload.user;
      state.accessToken = action.payload.token; // Keep for compatibility
      state.refreshToken = action.payload.refreshToken ?? state.refreshToken ?? null; // SECURITY_JWT_PLAN_RU.md, волна 5
      state.userId = action.payload.user?.id || null;
      state.fullAuth = true;
    },
    logoutReducer(state) {
      state.userId = null;
      state.user = null;
      state.accessToken = null;
      state.token = null;
      state.refreshToken = null;
      state.fullAuth = false;
    },
    setFullAuth(state, payload) {
      state.fullAuth = true;
    },
    updateTokens(state, action) {
      state.accessToken = action.payload.accessToken;
      state.refreshToken = action.payload.refreshToken;
    }
  },
  extraReducers: builder => {
    builder
      .addCase(loginUser.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        // New API might not return id, or might return it differently
        state.userId = action.payload?.id || action.payload?.userId || null;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(verifyCode.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verifyCode.fulfilled, (state, action) => {
        // Just set loading to false, actual auth is set via setAuth reducer
        // (matching web pattern where verification component handles decoding)
        state.loading = false;
      })
      .addCase(verifyCode.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(refreshToken.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(refreshToken.fulfilled, (state, action) => {
        // const decoded = jwtDecode(action.payload.accessToken);
        // console.log('asd',action.payload)
        state.loading = false;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
      })
      .addCase(refreshToken.rejected, (state, action) => {
        state.loading = false;
        state.error = action?.payload;
      })
      .addCase(signupUser.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signupUser.fulfilled, (state, action) => {
        state.loading = false;
        // New API might not return id, or might return it differently
        state.userId = action.payload?.id || action.payload?.userId || null;
      })
      .addCase(signupUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action?.payload;
      })
      .addCase(verificationSignup.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(verificationSignup.fulfilled, (state, action) => {
        const accessToken = action.payload?.accessToken;
        if (!accessToken || typeof accessToken !== 'string') {
          console.error('[AuthSlice] verificationSignup - Invalid accessToken:', {
            accessToken,
            type: typeof accessToken,
            payload: action.payload,
          });
          state.loading = false;
          state.error = 'Invalid token received from server';
          return;
        }

        try {
          const decoded = jwtDecode(accessToken);
        state.loading = false;
        state.userId = decoded.id;
        state.fullAuth = false;
          state.accessToken = accessToken;
          state.refreshToken = action.payload?.refreshToken;
        } catch (decodeError: any) {
          console.error('[AuthSlice] verificationSignup - Error decoding token:', decodeError);
          state.loading = false;
          state.error = 'Failed to decode authentication token';
        }
      })
      .addCase(verificationSignup.rejected, (state, action) => {
        state.loading = false;
        state.error = action?.payload ;
      })
  },
});

export const {setAuth, logoutReducer, setFullAuth, updateTokens} = authSlice.actions;
export default authSlice.reducer;
