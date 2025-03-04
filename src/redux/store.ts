import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // localStorage come storage predefinito
import authReducer from './slices/authSlice';

// Configurazione per redux-persist
const persistConfig = {
  key: 'root', // chiave per lo storage
  storage,
  // Qui puoi aggiungere blacklist o whitelist se necessario
};

// Crea un reducer persistente
const persistedAuthReducer = persistReducer(persistConfig, authReducer);

// Configura lo store con il reducer persistente
export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    // Qui possiamo aggiungere altri reducer in futuro
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