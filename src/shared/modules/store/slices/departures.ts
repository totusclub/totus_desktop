import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { fetchDeparturesRequest } from '../../api/levelTravelApi';

export type Departure = {
  id?: string | number;
  name?: string;
  name_en?: string;
  [key: string]: unknown;
};

type DeparturesState = {
  data: Departure[] | null;
  loading: boolean;
  error: string | null;
};

const initialState: DeparturesState = {
  data: null,
  loading: false,
  error: null,
};

export const fetchDepartures = createAsyncThunk(
  'departures/fetch',
  async () => {
    const res = await fetchDeparturesRequest();
    if (Array.isArray(res)) {
      return res as Departure[];
    }
    return ((res as any)?.departures ||
      (res as any)?.data ||
      []) as Departure[];
  },
);

const departuresSlice = createSlice({
  name: 'departures',
  initialState,
  reducers: {},
  extraReducers: builder => {
    builder
      .addCase(fetchDepartures.pending, state => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDepartures.fulfilled, (state, action) => {
        state.loading = false;
        state.data = action.payload;
      })
      .addCase(fetchDepartures.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to load departures';
      });
  },
});

export default departuresSlice.reducer;
