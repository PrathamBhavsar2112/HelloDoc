// src/config/api.ts
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export const API_ENDPOINTS = {
  // Auth endpoints
  AUTH: {
    LOGIN: `${API_BASE_URL}/api/auth/login`,
    LOGIN_VERIFY: `${API_BASE_URL}/api/auth/login/verify`,
    REGISTER: `${API_BASE_URL}/api/auth/register`,
    VERIFY_EMAIL: `${API_BASE_URL}/api/auth/verify-email`,
    REFRESH_TOKEN: `${API_BASE_URL}/api/auth/refresh-token`,
    LOGOUT: `${API_BASE_URL}/api/auth/logout`,
    FORGOT_PASSWORD: `${API_BASE_URL}/api/auth/forgot-password`,
    VERIFY_OTP: `${API_BASE_URL}/api/auth/verify-otp`,
    RESET_PASSWORD: `${API_BASE_URL}/api/auth/reset-password`,
  },
  
  // Appointment endpoints
  APPOINTMENTS: {
    BASE: `${API_BASE_URL}/api/appointments`,
    BOOK: `${API_BASE_URL}/api/appointments/book`,
    CANCEL: (id: string) => `${API_BASE_URL}/api/appointments/cancel/${id}`,
    RESCHEDULE: (id: string) => `${API_BASE_URL}/api/appointments/reschedule/${id}`,
    NO_SHOW: (id: string) => `${API_BASE_URL}/api/appointments/no-show/${id}`,
    BY_ID: (id: string) => `${API_BASE_URL}/api/appointments/${id}`,
  },
  
  // Doctor endpoints
  DOCTORS: {
    BASE: `${API_BASE_URL}/api/doctors`,
    PROFILE: `${API_BASE_URL}/api/doctors/profile`,
    PROFILE_BASIC: `${API_BASE_URL}/api/doctors/profile/basic`,
    PROFILE_AVAILABILITY: `${API_BASE_URL}/api/doctors/profile/availability`,
    PROFILE_ADDRESS: `${API_BASE_URL}/api/doctors/profile/address`,
    AVAILABILITY: `${API_BASE_URL}/api/doctors/availability`,
    PROFILE_PICTURE: `${API_BASE_URL}/api/doctors/profile-picture`,
    PUBLIC: (id: string) => `${API_BASE_URL}/api/doctors/public/${id}`,
    LIST_ALL: `${API_BASE_URL}/api/doctors/list/all`,
    CREDENTIALS: (id: string) => `${API_BASE_URL}/api/doctors/${id}/credentials`,
    CREDENTIAL_BY_ID: (doctorId: string, credentialId: string) => 
      `${API_BASE_URL}/api/doctors/${doctorId}/credentials/${credentialId}`,
    APPROVE_CREDENTIAL: (doctorId: string, credentialId: string) => 
      `${API_BASE_URL}/api/doctors/${doctorId}/credentials/${credentialId}/approve`,
    REJECT_CREDENTIAL: (doctorId: string, credentialId: string) => 
      `${API_BASE_URL}/api/doctors/${doctorId}/credentials/${credentialId}/reject`,
  },
  
  // Patient endpoints
  PATIENTS: {
    BASE: `${API_BASE_URL}/api/patient`,
    PROFILE: `${API_BASE_URL}/api/patient/profile`,
    UPLOAD_HEALTHCARD_FRONT: `${API_BASE_URL}/api/patient/upload/healthcard/front`,
    UPLOAD_HEALTHCARD_BACK: `${API_BASE_URL}/api/patient/upload/healthcard/back`,
    UPLOAD_INSURANCE: `${API_BASE_URL}/api/patient/upload/insurance`,
    UPLOAD_ALLERGY: `${API_BASE_URL}/api/patient/upload/allergy`,
    UPLOAD_MEDICAL_HISTORY: `${API_BASE_URL}/api/patient/upload/medical-history`,
  }
};

// For compatibility with existing code
export const API_BASE = `${API_BASE_URL}/api`;