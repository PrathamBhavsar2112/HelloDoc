// src/redux/hooks.ts
import { type TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from './store';
import { useMemo } from 'react';

// Enhanced hooks with memoization
export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// Memoized appointment hooks
export const useAppointments = () => {
  return useAppSelector((state) => state.appointment.appointments);
};

export const useUpcomingAppointments = () => {
  const appointments = useAppSelector((state) => state.appointment.appointments);
  
  return useMemo(() => {
    const now = new Date();
    return appointments
      .filter(apt => new Date(apt.scheduledFor) > now && apt.status !== 'cancelled')
      .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
  }, [appointments]);
};

export const useTodayAppointments = () => {
  const appointments = useAppSelector((state) => state.appointment.appointments);
  
  return useMemo(() => {
    const today = new Date().toDateString();
    return appointments.filter(apt => 
      new Date(apt.scheduledFor).toDateString() === today && apt.status !== 'cancelled'
    );
  }, [appointments]);
};

export const useAppointmentStats = () => {
  const appointments = useAppSelector((state) => state.appointment.appointments);
  
  return useMemo(() => {
    const scheduled = appointments.filter(apt => apt.status === 'scheduled');
    const completed = appointments.filter(apt => apt.status === 'completed');
    const cancelled = appointments.filter(apt => apt.status === 'cancelled');
    const total = appointments.length;
    
    return {
      total,
      scheduled: scheduled.length,
      completed: completed.length,
      cancelled: cancelled.length,
      completionRate: total > 0 ? Math.round((completed.length / total) * 100) : 0
    };
  }, [appointments]);
};

// User hooks
export const useCurrentUser = () => {
  return useAppSelector((state) => state.user.currentUser);
};

export const useUserRole = () => {
  return useAppSelector((state) => state.user.role);
};

export const useIsAuthenticated = () => {
  return useAppSelector((state) => state.auth.isAuthenticated);
};