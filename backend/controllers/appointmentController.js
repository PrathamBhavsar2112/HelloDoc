const { responseBody } = require('../config/responseBody');
const Appointment = require('../models/Appointments');
const cacheService = require('../services/cacheService');

const bookAppointment = async (req, res) => {
  try {
    const { doctorId, scheduledFor, reason } = req.body;
    const user = req.user;

    if (!user || user.role !== 'patient') {
      return res.status(403).json(responseBody(403, 'Forbidden: Only patients can book appointments', null));
    }

    if (!doctorId || !scheduledFor) {
      return res.status(400).json(responseBody(400, 'Validation error: doctorId and scheduledFor are required', null));
    }

    const startTime = new Date(scheduledFor);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

    // Optimized query with compound index on doctorId, status, and scheduledFor
    const conflictingAppointment = await Appointment.findOne({
      doctorId,
      status: { $ne: 'cancelled' },
      $or: [
        { scheduledFor: { $gte: startTime, $lt: endTime } },
        { scheduledFor: { $lte: startTime }, $expr: { $gt: [{ $add: ['$scheduledFor', 30 * 60 * 1000] }, startTime] } }
      ]
    }).lean();

    if (conflictingAppointment) {
      return res.status(409).json(responseBody(409, 'Conflict error: Doctor is already booked for this time slot', null));
    }

    const appointment = new Appointment({
      patientId: user.userId,
      doctorId,
      scheduledFor: startTime,
      reason,
      status: 'scheduled' // Default status
    });
    await appointment.save();

    // Clear cache with specific keys
    cacheService.delete(`appointment:${appointment._id}`);
    cacheService.clearPattern(`appointments:${user.userId}`);
    cacheService.clearPattern(`appointments:${doctorId}`);

    return res.status(201).json(responseBody(201, 'Appointment booked successfully', {
      appointmentId: appointment._id,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      scheduledFor: appointment.scheduledFor,
      reason: appointment.reason,
      status: appointment.status
    }));
  } catch (error) {
    console.error('Error booking appointment:', error);
    const status = error.name === 'ValidationError' ? 400 : 500;
    const message = error.name === 'ValidationError' 
      ? `Validation error: ${Object.values(error.errors).map(err => err.message).join(', ')}`
      : 'Internal Server Error: Unable to book appointment';
    return res.status(status).json(responseBody(status, message, null));
  }
};

const getAppointments = async (req, res) => {
  try {
    const { user } = req;

    if (!user || !user.userId) {
      return res.status(403).json(responseBody(403, 'Unauthorized: User not authenticated', null));
    }

    const cacheKey = `appointments:${user.userId}:${user.role}:${Date.now()}`;
    const cachedAppointments = cacheService.getMedium(cacheKey);
    if (cachedAppointments) {
      return res.status(200).json(responseBody(200, 'Appointments retrieved successfully (cached)', cachedAppointments));
    }

    const query = user.role === 'patient' ? { patientId: user.userId } : { doctorId: user.userId };
    const appointments = await Appointment.find(query)
      .populate('patientId', 'fullName email')
      .populate('doctorId', 'fullName email')
      .sort({ scheduledFor: -1 })
      .lean()
      .cache(900, cacheKey); // Cache for 15 minutes

    return res.status(200).json(responseBody(200, 'Appointments retrieved successfully', appointments));
  } catch (error) {
    console.error('Error retrieving appointments:', error);
    return res.status(500).json(responseBody(500, 'Internal Server Error: Unable to retrieve appointments', null));
  }
};

const getAppointmentById = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { user } = req;

    if (!user || !user.userId) {
      return res.status(403).json(responseBody(403, 'Unauthorized: User not authenticated', null));
    }

    if (!appointmentId) {
      return res.status(400).json(responseBody(400, 'Validation error: appointmentId is required', null));
    }

    const cacheKey = `appointment:${appointmentId}`;
    const cachedAppointment = cacheService.getShort(cacheKey);
    if (cachedAppointment) {
      return res.status(200).json(responseBody(200, 'Appointment retrieved successfully (cached)', cachedAppointment));
    }

    const appointment = await Appointment.findById(appointmentId)
      .populate('patientId', 'fullName email')
      .populate('doctorId', 'fullName email')
      .lean()
      .cache(300, cacheKey); // Cache for 5 minutes

    if (!appointment) {
      return res.status(404).json(responseBody(404, 'Not Found: Appointment not found', null));
    }

    if (appointment.patientId._id.toString() !== user.userId && 
        appointment.doctorId._id.toString() !== user.userId && 
        user.role !== 'admin') {
      return res.status(403).json(responseBody(403, 'Forbidden: You do not have permission to view this appointment', null));
    }

    const appointmentData = {
      appointmentId: appointment._id,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      scheduledFor: appointment.scheduledFor,
      reason: appointment.reason,
      status: appointment.status
    };

    return res.status(200).json(responseBody(200, 'Appointment retrieved successfully', appointmentData));
  } catch (error) {
    console.error('Error retrieving appointment:', error);
    const status = error.name === 'CastError' ? 400 : 500;
    const message = error.name === 'CastError' 
      ? 'Validation error: Invalid appointmentId format'
      : 'Internal Server Error: Unable to retrieve appointment';
    return res.status(status).json(responseBody(status, message, null));
  }
};

const cancelAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { user } = req;

    if (!user || !user.userId) {
      return res.status(403).json(responseBody(403, 'Unauthorized: User not authenticated', null));
    }

    if (!appointmentId) {
      return res.status(400).json(responseBody(400, 'Validation error: appointmentId is required', null));
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json(responseBody(404, 'Not Found: Appointment not found', null));
    }

    if (appointment.patientId.toString() !== user.userId && 
        appointment.doctorId.toString() !== user.userId && 
        user.role !== 'admin') {
      return res.status(403).json(responseBody(403, 'Forbidden: You do not have permission to cancel this appointment', null));
    }

    appointment.status = 'cancelled';
    await appointment.save();

    cacheService.delete(`appointment:${appointmentId}`);
    cacheService.clearPattern(`appointments:${appointment.patientId}`);
    cacheService.clearPattern(`appointments:${appointment.doctorId}`);

    return res.status(200).json(responseBody(200, 'Appointment cancelled successfully', {
      appointmentId: appointment._id,
      status: appointment.status
    }));
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    const status = error.name === 'CastError' || error.name === 'ValidationError' ? 400 : 500;
    const message = error.name === 'CastError' 
      ? 'Validation error: Invalid appointmentId format'
      : error.name === 'ValidationError' 
        ? `Validation error: ${Object.values(error.errors).map(err => err.message).join(', ')}`
        : 'Internal Server Error: Unable to cancel appointment';
    return res.status(status).json(responseBody(status, message, null));
  }
};

const rescheduleAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { scheduledFor, reason } = req.body;
    const { user } = req;

    if (!user || !user.userId) {
      return res.status(403).json(responseBody(403, 'Unauthorized: User not authenticated', null));
    }

    if (!scheduledFor || !appointmentId) {
      return res.status(400).json(responseBody(400, 'Validation error: appointmentId and scheduledFor are required', null));
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json(responseBody(404, 'Not Found: Appointment not found', null));
    }

    if (appointment.patientId.toString() !== user.userId && 
        appointment.doctorId.toString() !== user.userId && 
        user.role !== 'admin') {
      return res.status(403).json(responseBody(403, 'Forbidden: You do not have permission to reschedule this appointment', null));
    }

    const startTime = new Date(scheduledFor);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

    const conflictingAppointment = await Appointment.findOne({
      doctorId: appointment.doctorId,
      status: { $ne: 'cancelled' },
      $or: [
        { scheduledFor: { $gte: startTime, $lt: endTime } },
        { scheduledFor: { $lte: startTime }, $expr: { $gt: [{ $add: ['$scheduledFor', 30 * 60 * 1000] }, startTime] } }
      ]
    }).lean();

    if (conflictingAppointment) {
      return res.status(409).json(responseBody(409, 'Conflict error: Doctor is already booked for this time slot', null));
    }

    appointment.scheduledFor = startTime;
    appointment.reason = reason || appointment.reason;
    appointment.status = 're-scheduled';
    await appointment.save();

    cacheService.delete(`appointment:${appointmentId}`);
    cacheService.clearPattern(`appointments:${appointment.patientId}`);
    cacheService.clearPattern(`appointments:${appointment.doctorId}`);

    return res.status(200).json(responseBody(200, 'Appointment rescheduled successfully', {
      appointmentId: appointment._id,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      scheduledFor: appointment.scheduledFor,
      reason: appointment.reason,
      status: appointment.status
    }));
  } catch (error) {
    console.error('Error rescheduling appointment:', error);
    const status = error.name === 'CastError' || error.name === 'ValidationError' ? 400 : 500;
    const message = error.name === 'CastError' 
      ? 'Validation error: Invalid doctorId format'
      : error.name === 'ValidationError' 
        ? `Validation error: ${Object.values(error.errors).map(err => err.message).join(', ')}`
        : 'Internal Server Error: Unable to reschedule appointment';
    return res.status(status).json(responseBody(status, message, null));
  }
};

const noShowAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { user } = req;

    if (!user || !user.userId) {
      return res.status(403).json(responseBody(403, 'Unauthorized: User not authenticated', null));
    }

    if (!appointmentId) {
      return res.status(400).json(responseBody(400, 'Validation error: appointmentId is required', null));
    }

    if (user.role !== 'doctor' && user.role !== 'admin') {
      return res.status(403).json(responseBody(403, 'Forbidden: Only doctors can mark appointments as no-show', null));
    }

    const appointment = await Appointment.findById(appointmentId);
    if (!appointment) {
      return res.status(404).json(responseBody(404, 'Not Found: Appointment not found', null));
    }

    if (appointment.doctorId.toString() !== user.userId && user.role !== 'admin') {
      return res.status(403).json(responseBody(403, 'Forbidden: You do not have permission to update this appointment', null));
    }

    appointment.status = 'no-show';
    await appointment.save();

    cacheService.delete(`appointment:${appointmentId}`);
    cacheService.clearPattern(`appointments:${appointment.patientId}`);
    cacheService.clearPattern(`appointments:${appointment.doctorId}`);

    return res.status(200).json(responseBody(200, 'Appointment updated successfully', {
      appointmentId: appointment._id,
      status: appointment.status
    }));
  } catch (error) {
    console.error('Error updating appointment:', error);
    const status = error.name === 'CastError' || error.name === 'ValidationError' ? 400 : 500;
    const message = error.name === 'CastError' 
      ? 'Validation error: Invalid appointmentId format'
      : error.name === 'ValidationError' 
        ? `Validation error: ${Object.values(error.errors).map(err => err.message).join(', ')}`
        : 'Internal Server Error: Unable to update the appointment';
    return res.status(status).json(responseBody(status, message, null));
  }
};

const deleteAppointment = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { user } = req;

    if (!user || !user.userId) {
      return res.status(403).json(responseBody(403, 'Unauthorized: User not authenticated', null));
    }

    if (!appointmentId) {
      return res.status(400).json(responseBody(400, 'Validation error: appointmentId is required', null));
    }

    if (user.role !== 'admin') {
      return res.status(403).json(responseBody(403, 'Forbidden: Only admins can delete appointments', null));
    }

    const appointment = await Appointment.findByIdAndDelete(appointmentId);
    if (!appointment) {
      return res.status(404).json(responseBody(404, 'Not Found: Appointment not found', null));
    }

    cacheService.delete(`appointment:${appointmentId}`);
    cacheService.clearPattern(`appointments:${appointment.patientId}`);
    cacheService.clearPattern(`appointments:${appointment.doctorId}`);

    return res.status(200).json(responseBody(200, 'Appointment deleted successfully', { appointmentId }));
  } catch (error) {
    console.error('Error deleting appointment:', error);
    const status = error.name === 'ValidationError' ? 400 : 500;
    const message = error.name === 'ValidationError' 
      ? `Validation error: ${Object.values(error.errors).map(err => err.message).join(', ')}`
      : 'Internal Server Error: Unable to delete appointment';
    return res.status(status).json(responseBody(status, message, null));
  }
};

module.exports = {
  bookAppointment,
  getAppointments,
  getAppointmentById,
  cancelAppointment,
  rescheduleAppointment,
  noShowAppointment,
  deleteAppointment
};