import { configureStore } from '@reduxjs/toolkit';
import moviesReducer from "./movies/movies.slice";
import modalsReducer from "./modals/modals.slice";
import settingsReducer from "./settings/settings.slice";
import updatesReducer from "./updates/updates.slice";
import vpnReducer from "./vpn/vpn.slice";

export const makeStore = () => {
  return configureStore({
    reducer: {
      movies: moviesReducer,
      modals: modalsReducer,
      settings: settingsReducer,
      updates: updatesReducer,
      vpn: vpnReducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware({serializableCheck: false}),
  });
}

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];