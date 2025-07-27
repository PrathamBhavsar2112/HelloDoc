import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import authReducer from './reducers/authReducers';
import { forgotPasswordReducer } from './reducers/authReducers'; 
import userReducer from './reducers/userReducers';
import appointmentReducer from './reducers/appointmentReducer';
import patientReducer from './reducers/patientReducer';
import doctorReducer from './reducers/doctorReducer';

const userPersistConfig = {
  key: 'user',
  storage,
  whitelist: ['currentUser', 'role', 'verificationStatus', 'userId'] 
};

const appointmentPersistConfig = {
  key: 'appointment',
  storage,
  whitelist: ['appointments'] 
};

const authPersistConfig = {
  key: 'auth',
  storage,
  whitelist: ['isAuthenticated'] 
};


const persistedUserReducer = persistReducer(userPersistConfig, userReducer);
const persistedAppointmentReducer = persistReducer(appointmentPersistConfig, appointmentReducer);
const persistedAuthReducer = persistReducer(authPersistConfig, authReducer);

export const store = configureStore({
  reducer: {
    auth: persistedAuthReducer,
    forgotPassword: forgotPasswordReducer, 
    user: persistedUserReducer,
    appointment: persistedAppointmentReducer,
    patient: patientReducer,
    doctor: doctorReducer, 
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          'persist/PERSIST',
          'persist/REHYDRATE',
          'persist/PAUSE',
          'persist/PURGE',
          'persist/REGISTER'
        ],
        ignoredActionPaths: ['payload.headers', 'payload.config'],
        ignoredPaths: [
          'auth.refreshToken', 
          'auth.accessToken',
          'forgotPassword',
          'doctor',
          '_persist'
        ],
      },
    }),
  devTools: import.meta.env.MODE !== 'production',
});

export const persistor = persistStore(store);
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;