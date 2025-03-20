import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // localStorage come storage predefinito
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice'; // Nuovo import

// Configurazione per redux-persist
const persistConfig = {
  key: 'root', // chiave per lo storage
  storage,
  // Qui puoi aggiungere blacklist o whitelist se necessario
};

// Configurazione per redux-persist per uiReducer
const uiPersistConfig = {
  key: 'ui',
  storage,
};

// Crea reducer persistenti
const persistedAuthReducer = persistReducer(persistConfig, authReducer);
const persistedUiReducer = persistReducer(uiPersistConfig, uiReducer);

// Configura lo store con i reducer persistenti
export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    ui: persistedUiReducer, // Aggiungo il nuovo reducer
  },
  // Disabilita il serializable check per redux-persist
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

// Crea il persistor per PersistGate
export const persistor = persistStore(store);

// Funzione per pulire lo stato persistente durante il logout
export const purgeStore = () => {
  return persistor.purge();
};

// Inferisci i tipi RootState e AppDispatch dallo store stesso
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 