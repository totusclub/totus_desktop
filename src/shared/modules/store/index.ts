import { combineReducers, configureStore } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import authReducer from './slices/auth';
import searchReducer from './slices/search';
import destinationsReducer from './slices/destinations';
import departuresReducer from './slices/departures';
import { setVoipAccessToken, setVoipTokenGetter } from '../api/voipAuth';

// Та же структура, что в totus_APP (modules/store/index.ts); вместо AsyncStorage — localStorage.
const rootReducer = combineReducers({
  auth: authReducer,
  search: searchReducer,
  destinations: destinationsReducer,
  departures: departuresReducer,
});

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'search'],
};

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: getDefaultMiddleware =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

// voip.totus.club (favorites/users) использует тот же JWT, что и api.totus.club.
setVoipTokenGetter(() => store.getState().auth.accessToken || null);
store.subscribe(() => setVoipAccessToken(store.getState().auth.accessToken));
