import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchDestinationsRequest } from '../../api/levelTravelApi';
import type {
  DestinationItem,
  FetchDestinationsParams,
} from '../../../types/destinations';

type DestinationsState = {
  data: DestinationItem[] | null;
  loading: boolean;
  error: string | null;
};

const initialState: DestinationsState = {
  data: null,
  loading: false,
  error: null,
};

export const fetchDestinations = createAsyncThunk(
  'destinations/fetch',
  async (params: FetchDestinationsParams) => {
    const res = await fetchDestinationsRequest(params);
    if (Array.isArray(res)) {
      return res as DestinationItem[];
    }
    const payload = (res as any)?.results ?? (res as any)?.data ?? res;
    // Keep grouped autocomplete shape: [{ group_name, results }, ...]
    if (Array.isArray(payload)) {
      return payload as DestinationItem[];
    }
    return [] as DestinationItem[];
  },
);

const destinationsSlice = createSlice({
  name: 'destinations',
  initialState,
  reducers: {
    clearDestinations(state) {
      state.data = null;
      state.error = null;
    },
  },
  extraReducers: builder => {
    builder
      .addCase(fetchDestinations.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDestinations.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchDestinations.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load destinations';
      });
  },
});

export const { clearDestinations } = destinationsSlice.actions;
export default destinationsSlice.reducer;
