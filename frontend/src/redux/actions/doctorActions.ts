import axios, { type AxiosResponse } from 'axios';
import { createAsyncThunk } from '@reduxjs/toolkit';
import { API_ENDPOINTS } from '../../config/api';
import type {
    Doctor,
    DoctorAvailability,
} from '../types/doctorTypes';

// Define API response structure
interface ApiResponse<T = unknown> {
  data: {
    body: T;
  };
}

// Define direct response structure for axios calls
interface DirectApiResponse {
  data: {
    body: unknown;
  };
}

// Define error structure
interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message: string;
}

// Helper function for API calls
const apiRequest = async (
  url: string,
  method: string = 'GET',
  data?: unknown,
  headers: Record<string, string> = {}
): Promise<AxiosResponse<ApiResponse>> => {
  const token = localStorage.getItem('accessToken');
  const config = {
    method,
    url,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...headers,
    },
    data,
  };
  return axios(config);
};

// Profile Actions
export const getDoctorProfile = createAsyncThunk(
  'doctor/getDoctorProfile',
  async (doctorId: string | null, { rejectWithValue }) => {
    try {
      const url = doctorId ? `${API_ENDPOINTS.DOCTORS.PROFILE}?doctorId=${doctorId}` : API_ENDPOINTS.DOCTORS.PROFILE;
      const response = await apiRequest(url);
      return response.data.data.body;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.response?.data?.message || apiError.message);
    }
  }
);

export const updateBasicDoctorProfile = createAsyncThunk(
  'doctor/updateBasicDoctorProfile',
  async (profileData: Partial<Doctor>, { rejectWithValue }) => {
    try {
      const response = await apiRequest(API_ENDPOINTS.DOCTORS.PROFILE_BASIC, 'PUT', profileData);
      return response.data.data.body;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.response?.data?.message || apiError.message);
    }
  }
);

export const updateDoctorAddress = createAsyncThunk(
  'doctor/updateDoctorAddress',
  async (addressData: { address: string; coordinates: [number, number] }, { rejectWithValue }) => {
    try {
      const response = await apiRequest(API_ENDPOINTS.DOCTORS.PROFILE_ADDRESS, 'PUT', addressData);
      return response.data.data.body;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.response?.data?.message || apiError.message);
    }
  }
);

export const uploadProfilePicture = createAsyncThunk(
  'doctor/uploadProfilePicture',
  async (file: File, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('image', file);
      
      const token = localStorage.getItem('accessToken');
      const response = await axios.post<DirectApiResponse>(API_ENDPOINTS.DOCTORS.PROFILE_PICTURE, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data.data.body;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.response?.data?.message || apiError.message);
    }
  }
);

// Availability Actions
export const updateAvailability = createAsyncThunk(
  'doctor/updateAvailability',
  async (slots: DoctorAvailability[], { rejectWithValue }) => {
    try {
      const response = await apiRequest(API_ENDPOINTS.DOCTORS.PROFILE_AVAILABILITY, 'PUT', { slots });
      return response.data.data.body;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.response?.data?.message || apiError.message);
    }
  }
);

export const getAvailability = createAsyncThunk(
  'doctor/getAvailability',
  async ({ doctorId }: { doctorId?: string } = {}, { rejectWithValue }) => {
    try {
      const url = doctorId ? `${API_ENDPOINTS.DOCTORS.AVAILABILITY}?doctorId=${doctorId}` : API_ENDPOINTS.DOCTORS.AVAILABILITY;
      const response = await apiRequest(url);
      return response.data.data.body;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.response?.data?.message || apiError.message);
    }
  }
);

// Credentials Actions
export const submitDoctorCredential = createAsyncThunk(
  'doctor/submitDoctorCredential',
  async ({ doctorId, file }: { doctorId: string; file: File }, { rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const token = localStorage.getItem('accessToken');
      const response = await axios.post<DirectApiResponse>(API_ENDPOINTS.DOCTORS.CREDENTIALS(doctorId), formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });
      return response.data.data.body;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.response?.data?.message || apiError.message);
    }
  }
);

export const getDoctorCredentials = createAsyncThunk(
  'doctor/getDoctorCredentials',
  async (doctorId: string, { rejectWithValue }) => {
    try {
      const response = await apiRequest(API_ENDPOINTS.DOCTORS.CREDENTIALS(doctorId));
      return response.data.data.body;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.response?.data?.message || apiError.message);
    }
  }
);

export const getDoctorCredentialById = createAsyncThunk(
  'doctor/getDoctorCredentialById',
  async ({ doctorId, credentialId }: { doctorId: string; credentialId: string }, { rejectWithValue }) => {
    try {
      const response = await apiRequest(API_ENDPOINTS.DOCTORS.CREDENTIAL_BY_ID(doctorId, credentialId));
      return response.data.data.body;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.response?.data?.message || apiError.message);
    }
  }
);

export const approveDoctorCredential = createAsyncThunk(
  'doctor/approveDoctorCredential',
  async ({ doctorId, credentialId, adminId }: { doctorId: string; credentialId: string; adminId: string }, { rejectWithValue }) => {
    try {
      const response = await apiRequest(
        API_ENDPOINTS.DOCTORS.APPROVE_CREDENTIAL(doctorId, credentialId),
        'PUT',
        { adminId }
      );
      return response.data.data.body;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.response?.data?.message || apiError.message);
    }
  }
);

export const rejectDoctorCredential = createAsyncThunk(
  'doctor/rejectDoctorCredential',
  async ({ doctorId, credentialId, adminId, reason }: { doctorId: string; credentialId: string; adminId: string; reason: string }, { rejectWithValue }) => {
    try {
      const response = await apiRequest(
        API_ENDPOINTS.DOCTORS.REJECT_CREDENTIAL(doctorId, credentialId),
        'PUT',
        { adminId, reason }
      );
      return response.data.data.body;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.response?.data?.message || apiError.message);
    }
  }
);

// Public Actions
export const getPublicDoctorProfile = createAsyncThunk(
  'doctor/getPublicDoctorProfile',
  async (doctorId: string, { rejectWithValue }) => {
    try {
      const response = await apiRequest(API_ENDPOINTS.DOCTORS.PUBLIC(doctorId));
      return response.data.data.body;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.response?.data?.message || apiError.message);
    }
  }
);

export const listDoctors = createAsyncThunk(
  'doctor/listDoctors',
  async (params: { 
    specialization?: string; 
    lng?: number; 
    lat?: number; 
    radius?: number; 
    page?: number; 
    limit?: number 
  } = {}, { rejectWithValue }) => {
    try {
      const queryParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });
      
      const queryString = queryParams.toString();
      const url = queryString ? `${API_ENDPOINTS.DOCTORS.LIST_ALL}?${queryString}` : API_ENDPOINTS.DOCTORS.LIST_ALL;
      const response = await apiRequest(url);
      return response.data.data.body;
    } catch (error) {
      const apiError = error as ApiError;
      return rejectWithValue(apiError.response?.data?.message || apiError.message);
    }
  }
);

// Reset action
export const resetDoctorState = createAsyncThunk(
  'doctor/resetDoctorState',
  async () => {
    return null;
  }
);

// Clear error action
export const clearDoctorError = createAsyncThunk(
  'doctor/clearDoctorError',
  async () => {
    return null;
  }
);