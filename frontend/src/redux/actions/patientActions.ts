import { createAsyncThunk } from '@reduxjs/toolkit';
import { API_ENDPOINTS } from '../../config/api';
import type {
  PatientProfile,
  PatientDocument
} from '../types/patientTypes';

import { BASE_URL } from '../../constant_url';

type RequestInit = globalThis.RequestInit;
type HeadersInit = globalThis.HeadersInit;

interface UserData {
  fullName: string;
  email: string;
}

interface ProfileResponse {
  user: UserData;
  profile: PatientProfile;
}

interface ErrorResponse {
  message: string;
  [key: string]: unknown;
}

const fetchWithAuth = async <T>(url: string, options: RequestInit = {}, isJson: boolean = true): Promise<{ body: T }> => {
  const token = localStorage.getItem('accessToken');
  
  const headers: HeadersInit = {
    ...(isJson && { 'Content-Type': 'application/json' }),
    Authorization: `Bearer ${token}`,
    ...options.headers,
  };

<<<<<<< HEAD
  const response = await fetch(url, {
=======
  const response = await fetch(`${BASE_URL}${url}`, {
>>>>>>> upstream/develop
    ...options,
    headers,
  });

  if (!response.ok) {
    const errorData: ErrorResponse = await response.json();
    throw new Error(errorData.message || 'Request failed');
  }

  return response.json();
};

export const fetchPatientProfile = createAsyncThunk(
  'patient/fetchProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetchWithAuth<ProfileResponse>(API_ENDPOINTS.PATIENTS.PROFILE);
      return response.body.profile;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('An unknown error occurred');
    }
  }
);

export const updatePatientProfile = createAsyncThunk(
  'patient/updateProfile',
  async (profileData: Partial<PatientProfile>, { rejectWithValue }) => {
    try {
      const response = await fetchWithAuth<PatientProfile>(API_ENDPOINTS.PATIENTS.PROFILE, {
        method: 'PUT',
        body: JSON.stringify(profileData),
      });
      return response.body;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('An unknown error occurred');
    }
  }
);

export const uploadPatientDocument = createAsyncThunk(
  'patient/uploadDocument',
  async ({ docType, file }: { docType: string, file: File }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      let endpoint = '';
      switch (docType) {
        case 'healthcard-front':
          endpoint = API_ENDPOINTS.PATIENTS.UPLOAD_HEALTHCARD_FRONT;
          break;
        case 'healthcard-back':
          endpoint = API_ENDPOINTS.PATIENTS.UPLOAD_HEALTHCARD_BACK;
          break;
        case 'insurance':
          endpoint = API_ENDPOINTS.PATIENTS.UPLOAD_INSURANCE;
          break;
        case 'allergy':
          endpoint = API_ENDPOINTS.PATIENTS.UPLOAD_ALLERGY;
          break;
        case 'history':
          endpoint = API_ENDPOINTS.PATIENTS.UPLOAD_MEDICAL_HISTORY;
          break;
        default:
          throw new Error('Invalid document type');
      }

      const response = await fetchWithAuth<PatientDocument>(endpoint, {
        method: 'POST',
        body: formData,
      }, false);

      return response.body;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('An unknown error occurred');
    }
  }
);

export const fetchPatientDocuments = createAsyncThunk(
  'patient/fetchDocuments',
  async (_, { rejectWithValue }) => {
    try {
      const response = await fetchWithAuth<PatientDocument[]>(`${API_ENDPOINTS.PATIENTS.BASE}/documents`);
      return response.body;
    } catch (error: unknown) {
      if (error instanceof Error) {
        return rejectWithValue(error.message);
      }
      return rejectWithValue('An unknown error occurred');
    }
  }
);