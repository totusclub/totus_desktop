import {createSlice, createAsyncThunk} from '@reduxjs/toolkit';
import {
  startSearch,
  checkSearchStatus,
  getGroupedHotels,
} from '../../api/levelTravelApi';
import {
  SearchParams,
  FilterParams,
  SearchStatus,
  GroupedHotelsResponse,
  Hotel,
} from '../types/search';
import {buildApiSearchParams, withSearchTypeFilters} from '../../../utils/searchParamsUtils';

interface SearchState {
  hotels: GroupedHotelsResponse | null;
  progress: SearchStatus;
  loading: boolean;
  error: string | null;
  requestId: string | null | undefined;
  operators: string[];
  headerName: string;
  startSearchValid: boolean;
  loadMore: boolean;
  allMyHotels: Hotel[];
  searchParams: SearchParams | null;
}

const initialState: SearchState = {
  hotels: null,
  progress: {},
  loading: false,
  error: null,
  requestId: null,
  operators: [],
  headerName: '',
  startSearchValid: true,
  loadMore: false,
  allMyHotels: [],
  searchParams: null,
};

// Thunk
export const runFullSearchFlow = createAsyncThunk(
  'search/runFullSearchFlow',
  async (
    {
      searchParams,
      filterParams,
    }: {searchParams: SearchParams; filterParams?: FilterParams},
    {rejectWithValue, dispatch},
  ) => {
    try {
      const apiSearchParams = buildApiSearchParams(searchParams);
      console.log('[Search] runFullSearchFlow', {
        searchParams: apiSearchParams,
        filterParams,
      });
      const {request_id} = await startSearch(apiSearchParams);
      console.log('[Search] request_id', request_id);

      return await new Promise<GroupedHotelsResponse>((resolve, reject) => {
        let interval: ReturnType<typeof setInterval> | undefined;

        const pollStatus = async () => {
          try {
            const statusMap = await checkSearchStatus(request_id);
            dispatch(updateProgress(statusMap));

            const readyOperators = Object.entries(statusMap)
              .filter(
                ([_, status]) => status === 'completed' || status === 'cached',
              )
              .map(([id]) => id);

            console.log('[Search] status poll', {readyOperators, statusMap});

            if (readyOperators.length === 0) {
              return;
            }

            if (interval) {
              clearInterval(interval);
            }

            let filters: FilterParams = {
              request_id,
              readyOperators,
            };

            if (filterParams && typeof filterParams === 'object') {
              filters = {...filters, ...filterParams};
            }

            filters = withSearchTypeFilters(apiSearchParams.search_type, filters);

            console.log('[Search] grouped-hotels request', filters);
            const hotels = await getGroupedHotels(filters);
            console.log('[Search] grouped-hotels result', {
              hotels_count: hotels?.hotels_count ?? hotels?.hotels?.length ?? 0,
              search_type: hotels?.search_type ?? apiSearchParams.search_type,
            });
            resolve({
              ...hotels,
              ...filters,
              search_type: apiSearchParams.search_type,
              emptyType: 'RELOAD',
            });
          } catch (err) {
            if (interval) {
              clearInterval(interval);
            }
            reject(err);
          }
        };

        void pollStatus();
        // 6s poll reduces parallel TLS bursts (TSPU on some RU mobile networks).
        interval = setInterval(pollStatus, 6000);
      });
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to complete search');
    }
  },
);

export const searchFilters = createAsyncThunk(
  'search/filters',
  async (params: FilterParams, {rejectWithValue}) => {
    try {
      const hotels = await getGroupedHotels(params);
      // Persist applied filter params; never drop API facet `filters`.
      const {
        request_id,
        readyOperators,
        page_number,
        page_limit,
        hotels: _hotelsIgnored,
        filters: _filtersIgnored,
        statistics: _statisticsIgnored,
        ...appliedFilters
      } = (params || {}) as Record<string, unknown>;

      return {
        ...hotels,
        ...appliedFilters,
        request_id: hotels?.request_id ?? request_id,
        readyOperators: (hotels as any)?.readyOperators ?? readyOperators,
        filters: hotels?.filters,
        statistics: (hotels as any)?.statistics,
        hotels: hotels?.hotels,
        hotels_count: (hotels as any)?.hotels_count,
        page_number: (page_number as number | undefined) ?? hotels?.page_number,
        page_limit:
          (page_limit as number | undefined) ?? (hotels as any)?.page_limit,
      } as GroupedHotelsResponse;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to fetch grouped hotels');
    }
  },
);

// Slice
const searchSlice = createSlice({
  name: 'search',
  initialState,
  reducers: {
    updateProgress(state, action) {
      state.progress = action.payload;
    },
    clearSearch(state) {
      state.hotels = null;
      state.progress = {};
      state.loading = false;
      state.error = null;
      state.headerName = '';
      state.startSearchValid = true;
      state.loadMore = false;
      state.allMyHotels = [];
      state.requestId = null;
      state.operators = [];
      state.searchParams = null;
    },
    setSearchParams(state, action) {
      state.searchParams = action.payload;
    },
    setHeaderName(state, action) {
      state.headerName = action.payload;
    },
    setStartSearch(state, action) {
      state.startSearchValid = action.payload;
    },
    setLoadMore(state, action) {
      state.loadMore = action.payload;
    },
    appendAllHotels(state, action) {
      state.allMyHotels = [...state.allMyHotels, ...action.payload.hotels];
    },
    setAllMyHotels(state, action) {
      // Handle both { hotels: [] } and [] formats
      if (Array.isArray(action.payload)) {
        state.allMyHotels = action.payload;
      } else {
        state.allMyHotels = action.payload?.hotels || [];
      }
    },
  },
  extraReducers: builder => {
    builder
      .addCase(runFullSearchFlow.pending, (state, action) => {
        state.loading = true;
        state.error = null;
        state.progress = {};
        // Clear old hotels immediately when starting new search
        state.allMyHotels = [];
        state.hotels = null;
        // Store search params from the thunk argument
        if (action.meta.arg?.searchParams) {
          state.searchParams = action.meta.arg.searchParams;
        }
      })
      .addCase(runFullSearchFlow.fulfilled, (state, action) => {
        state.hotels = action.payload;
        state.loading = false;
        state.allMyHotels = action.payload.hotels || [];
        state.requestId = action.payload.request_id;
      })
      .addCase(runFullSearchFlow.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(searchFilters.pending, state => {
        state.loading = true;
        state.error = null;
        state.progress = {};
      })
      .addCase(searchFilters.fulfilled, (state, action) => {
        state.hotels = action.payload;
        state.loading = false;

        // If page_number is 1, replace hotels. Otherwise append for pagination
        const pageNumber = action.payload.page_number || 1;
        const hotels = action.payload.hotels || [];

        if (pageNumber === 1) {
          // Replace the entire list for new searches/filters/sorts
          state.allMyHotels = hotels;
        } else {
          // Append for pagination, avoiding duplicates by hotel ID
          const existingIds = new Set((state.allMyHotels || []).map(h => {
            const hotelData = (h as any).hotel || h;
            return hotelData.id || (h as any).id || h.id;
          }));
          const newHotels = hotels.filter(h => {
            const hotelData = (h as any).hotel || h;
            const hotelId = hotelData.id || (h as any).id || h.id;
            return !existingIds.has(hotelId);
          });
          state.allMyHotels = [...(state.allMyHotels || []), ...newHotels];
        }
      })
      .addCase(searchFilters.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const {
  updateProgress,
  clearSearch,
  setHeaderName,
  setStartSearch,
  setLoadMore,
  setAllMyHotels,
  appendAllHotels,
  setSearchParams,
} = searchSlice.actions;

export default searchSlice.reducer;

