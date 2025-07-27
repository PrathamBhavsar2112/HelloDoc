// src/redux/selectors/appointmentSelectors.ts
import { createSelector } from 'reselect';
import type { AppointmentState } from '../types/appointmentTypes';

// Base selector
const selectAppointmentState = (state: { appointment: AppointmentState }) => state.appointment;

// Memoized selectors for better performance
export const selectAppointments = createSelector(
  [selectAppointmentState],
  (appointmentState) => appointmentState.appointments
);

export const selectSelectedAppointment = createSelector(
  [selectAppointmentState],
  (appointmentState) => appointmentState.selectedAppointment
);

export const selectAppointmentLoading = createSelector(
  [selectAppointmentState],
  (appointmentState) => appointmentState.loading
);

export const selectAppointmentError = createSelector(
  [selectAppointmentState],
  (appointmentState) => appointmentState.error
);

// Advanced memoized selectors for complex computations
export const selectUpcomingAppointments = createSelector(
  [selectAppointments],
  (appointments) => {
    const now = new Date();
    return appointments
      .filter(apt => new Date(apt.scheduledFor) > now && apt.status !== 'cancelled')
      .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
  }
);

export const selectTodayAppointments = createSelector(
  [selectAppointments],
  (appointments) => {
    const today = new Date().toDateString();
    return appointments.filter(apt => 
      new Date(apt.scheduledFor).toDateString() === today && apt.status !== 'cancelled'
    );
  }
);

export const selectPastAppointments = createSelector(
  [selectAppointments],
  (appointments) => {
    const now = new Date();
    return appointments
      .filter(apt => new Date(apt.scheduledFor) <= now)
      .sort((a, b) => new Date(b.scheduledFor).getTime() - new Date(a.scheduledFor).getTime());
  }
);

export const selectAppointmentsByStatus = createSelector(
  [selectAppointments],
  (appointments) => {
    return {
      scheduled: appointments.filter(apt => apt.status === 'scheduled'),
      completed: appointments.filter(apt => apt.status === 'completed'),
      cancelled: appointments.filter(apt => apt.status === 'cancelled'),
      rescheduled: appointments.filter(apt => apt.status === 're-scheduled'),
      noShow: appointments.filter(apt => apt.status === 'no-show')
    };
  }
);

export const selectAppointmentStats = createSelector(
  [selectAppointmentsByStatus],
  (appointmentsByStatus) => {
    const total = Object.values(appointmentsByStatus).reduce((sum, arr) => sum + arr.length, 0);
    return {
      total,
      scheduled: appointmentsByStatus.scheduled.length,
      completed: appointmentsByStatus.completed.length,
      cancelled: appointmentsByStatus.cancelled.length,
      rescheduled: appointmentsByStatus.rescheduled.length,
      noShow: appointmentsByStatus.noShow.length,
      completionRate: total > 0 ? Math.round((appointmentsByStatus.completed.length / total) * 100) : 0
    };
  }
);