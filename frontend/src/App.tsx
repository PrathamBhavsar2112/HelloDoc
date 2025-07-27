
import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

import Home from './pages/Home';

// Lazy load all other components to reduce initial bundle size
const Login = React.lazy(() => import('./pages/Login'));
const PatientRegister = React.lazy(() => import('./pages/PatientRegister'));
const DoctorRegister = React.lazy(() => import('./pages/DoctorRegister'));
const AppointmentBooking = React.lazy(() => import('./pages/AppointmentBooking'));
const DoctorSelection = React.lazy(() => import('./pages/DoctorSelection'));
const DoctorProfile = React.lazy(() => import('./pages/DoctorProfile'));
const PatientProfile = React.lazy(() => import('./pages/PatientProfile'));
const PatientDashboard = React.lazy(() => import('./pages/PatientDashboard'));
const DoctorDashboard = React.lazy(() => import('./pages/DoctorDashboard'));
const PatientCalendar = React.lazy(() => import('./pages/PatientCalendar'));
const DoctorCalendar = React.lazy(() => import('./pages/DoctorCalendar'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const VerifyOtpPage = React.lazy(() => import('./pages/VerifyOtp'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = React.lazy(() => import('./pages/VerifyEmail'));
const ChatPage = React.lazy(() => import('./pages/ChatPage'));

// Optimized loading component
const LoadingSpinner = () => (
  <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
    <div className="text-center">
      <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
      <p className="text-blue-600 text-lg font-medium">Loading...</p>
      <p className="text-gray-500 text-sm mt-2">Please wait while we load the page</p>
    </div>
  </div>
);

function App() {
  return (
    <div data-testid="app-container">
      <Router>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/patientregister" element={<PatientRegister />} />
            <Route path="/doctorregister" element={<DoctorRegister />} />
            <Route path="/book-appointment" element={<AppointmentBooking />} />
            <Route path="/select-doctor" element={<DoctorSelection />} />
            <Route path="/doctor-profile" element={<DoctorProfile />} />
            <Route path="/patient-profile" element={<PatientProfile />} />
            <Route path="/patient-dashboard" element={<PatientDashboard />} />
            <Route path="/doctor-dashboard" element={<DoctorDashboard />} />
            <Route path="/patient-calendar" element={<PatientCalendar />} />
            <Route path="/doctor-calendar" element={<DoctorCalendar />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/verify-otp" element={<VerifyOtpPage />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/patient/book-appointment" element={<AppointmentBooking />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="*" element={<Home />} /> 
          </Routes>
        </Suspense>
      </Router>
    </div>
  );
}

export default App;