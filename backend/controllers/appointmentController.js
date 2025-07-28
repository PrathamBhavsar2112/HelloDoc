const { responseBody } = require('../config/responseBody');
const Appointment = require('../models/Appointments');
const cacheService = require('../services/cacheService');

// Pre-compiled aggregation pipelines for reuse
const APPOINTMENT_AGGREGATION_PIPELINE = {
  patient: (userId) => [
    { $match: { patientId: userId } },
    { $sort: { scheduledFor: -1 } },
    {
      $lookup: {
        from: 'users',
        localField: 'doctorId',
        foreignField: '_id',
        as: 'doctorInfo',
        pipeline: [{ $project: { fullName: 1, email: 1 } }]
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'patientId',
        foreignField: '_id',
        as: 'patientInfo',
        pipeline: [{ $project: { fullName: 1, email: 1 } }]
      }
    },
    {
      $addFields: {
        doctorId: { $arrayElemAt: ['$doctorInfo', 0] },
        patientId: { $arrayElemAt: ['$patientInfo', 0] }
      }
    },
    { $unset: ['doctorInfo', 'patientInfo'] }
  ],
  doctor: (userId) => [
    { $match: { doctorId: userId } },
    { $sort: { scheduledFor: -1 } },
    {
      $lookup: {
        from: 'users',
        localField: 'patientId',
        foreignField: '_id',
        as: 'patientInfo',
        pipeline: [{ $project: { fullName: 1, email: 1 } }]
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'doctorId',
        foreignField: '_id',
        as: 'doctorInfo',
        pipeline: [{ $project: { fullName: 1, email: 1 } }]
      }
    },
    {
      $addFields: {
        patientId: { $arrayElemAt: ['$patientInfo', 0] },
        doctorId: { $arrayElemAt: ['$doctorInfo', 0] }
      }
    },
    { $unset: ['patientInfo', 'doctorInfo'] }
  ]
};

const bookAppointment = async (req, res) => {
  try {
    const { doctorId, scheduledFor, reason } = req.body;
    const user = req.user;

    // Early validation - fail fast
    if (!user || user.role !== 'patient') {
      return res.status(403).json(
        responseBody(403, 'Forbidden: Only patients can book appointments', null)
      );
    }

    if (!doctorId || !scheduledFor) {
      return res.status(400).json(
        responseBody(400, 'Validation error: doctorId and scheduledFor are required', null)
      );
    }

    const startTime = new Date(scheduledFor);
    const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);

    // Optimized conflict check with compound index usage
    // Uses: { doctorId: 1, scheduledFor: 1, status: 1 } index
    const conflictingAppointment = await Appointment.findOne({
      doctorId,
      scheduledFor: {
        $gte: new Date(startTime.getTime() - 30 * 60 * 1000), // 30 min before
        $lt: endTime
      },
      status: { $nin: ['cancelled', 'completed'] }
    })
    .select('_id') // Only fetch ID for existence check
    .lean()
    .hint({ doctorId: 1, scheduledFor: 1, status: 1 }); // Force index usage
    
    if (conflictingAppointment) {
      return res.status(409).json(
        responseBody(409, 'Conflict error: Doctor is already booked for this time slot', null)
      );
    }

    // Create appointment with minimal data
    const appointmentData = {
      patientId: user.userId,
      doctorId,
      scheduledFor: startTime,
      reason,
      status: 'scheduled',
      createdAt: new Date()
    };

    const appointment = new Appointment(appointmentData);
    await appointment.save();

    // Async cache invalidation - don't wait for it
    setImmediate(() => {
      try {
        cacheService.clearPattern(`appointments:${user.userId}`);
        cacheService.clearPattern(`appointments:${doctorId}`);
        // Pre-warm cache for the patient
        cacheService.delete(`appointments:${user.userId}:patient`);
      } catch (cacheError) {
        console.warn('Cache invalidation failed:', cacheError);
      }
    });

    // Return minimal response data
    return res.status(201).json(
      responseBody(201, 'Appointment booked successfully', {
        appointmentId: appointment._id,
        patientId: appointment.patientId,
        doctorId: appointment.doctorId,
        scheduledFor: appointment.scheduledFor,
        status: appointment.status,
        reason: appointment.reason
      })
    );
  } catch (error) {
    console.error('Error booking appointment:', error);
    
    // Handle validation errors efficiently
    if (error.name === 'ValidationError') {
      const errorMessage = Object.keys(error.errors)[0] + ' is invalid';
      return res.status(400).json(
        responseBody(400, `Validation error: ${errorMessage}`, null)
      );
    }
    
    return res.status(500).json(
      responseBody(500, 'Internal Server Error: Unable to book appointment', null)
    );
  }
};

const getAppointments = async (req, res) => {
  try {
    const { user } = req;

    if (!user || !user.userId) {
      return res.status(403).json(
        responseBody(403, 'Unauthorized: User not authenticated', null)
      );
    }

    const cacheKey = `appointments:${user.userId}:${user.role}`;
    
    // Try cache first
    const cachedAppointments = cacheService.getMedium(cacheKey);
    if (cachedAppointments) {
      return res.status(200).json(
        responseBody(200, 'Appointments retrieved successfully (cached)', cachedAppointments)
      );
    }

    // Use optimized aggregation pipeline instead of populate
    const pipeline = APPOINTMENT_AGGREGATION_PIPELINE[user.role](user.userId);
    
    if (!pipeline) {
      return res.status(403).json(
        responseBody(403, 'Invalid user role', null)
      );
    }

    // Execute aggregation with hint for optimal index usage
    const appointments = await Appointment.aggregate(pipeline)
      .option({ 
        allowDiskUse: false, // Keep in memory for better performance
        maxTimeMS: 5000 // 5 second timeout
      });

    // Cache the results asynchronously
    setImmediate(() => {
      try {
        cacheService.setMedium(cacheKey, appointments);
      } catch (cacheError) {
        console.warn('Cache set failed:', cacheError);
      }
    });

    return res.status(200).json(
      responseBody(200, 'Appointments retrieved successfully', appointments)
    );
  } catch (error) {
    console.error('Error retrieving appointments:', error);
    
    // Handle timeout errors specifically
    if (error.name === 'MongoServerSelectionError' || error.code === 50) {
      return res.status(504).json(
        responseBody(504, 'Database timeout: Please try again', null)
      );
    }
    
    return res.status(500).json(
      responseBody(500, 'Internal Server Error: Unable to retrieve appointments', null)
    );
  }
};

// Optimized helper function for batch operations
const getAppointmentsByIds = async (appointmentIds, userId, userRole) => {
  if (!appointmentIds?.length) return [];
  
  const cacheKey = `batch_appointments:${userId}:${appointmentIds.join(',')}`;
  const cached = cacheService.getShort(cacheKey);
  if (cached) return cached;

  const pipeline = [
    { $match: { _id: { $in: appointmentIds } } },
    ...APPOINTMENT_AGGREGATION_PIPELINE[userRole](userId).slice(1) // Skip the user match
  ];

  const appointments = await Appointment.aggregate(pipeline);
  cacheService.setShort(cacheKey, appointments);
  
  return appointments;
};

// Additional optimization: Bulk appointment operations
const bulkUpdateAppointments = async (updates) => {
  if (!updates?.length) return;
  
  const bulkOps = updates.map(({ id, update }) => ({
    updateOne: {
      filter: { _id: id },
      update: { $set: { ...update, updatedAt: new Date() } }
    }
  }));

  return await Appointment.bulkWrite(bulkOps, { ordered: false });
};

const getAppointmentById = async (req, res) => {
  try {
    const { appointmentId } = req.params;
    const { user } = req;

    if (!user || !user.userId) {
      return res.status(403).json(
        responseBody(403, 'Unauthorized: User not authenticated', null)
      );
    }

    if (!appointmentId) {
      return res.status(400).json(
        responseBody(400, 'Validation error: appointmentId is required', null)
      );
    }

    const cacheKey = `appointment:${appointmentId}`;
    const cachedAppointment = cacheService.getShort(cacheKey);
    if (cachedAppointment) {
      return res.status(200).json(
        responseBody(200, 'Appointment retrieved successfully (cached)', cachedAppointment)
      );
    }

    // Use aggregation for better performance
    const appointments = await Appointment.aggregate([
      { $match: { _id: appointmentId } },
      {
        $lookup: {
          from: 'users',
          localField: 'patientId',
          foreignField: '_id',
          as: 'patientInfo',
          pipeline: [{ $project: { fullName: 1, email: 1 } }]
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'doctorId',
          foreignField: '_id',
          as: 'doctorInfo',
          pipeline: [{ $project: { fullName: 1, email: 1 } }]
        }
      },
      {
        $addFields: {
          patientId: { $arrayElemAt: ['$patientInfo', 0] },
          doctorId: { $arrayElemAt: ['$doctorInfo', 0] }
        }
      },
      { $unset: ['patientInfo', 'doctorInfo'] }
    ]);

    const appointment = appointments[0];

    if (!appointment) {
      return res.status(404).json(
        responseBody(404, 'Not Found: Appointment not found', null)
      );
    }

    // Authorization check
    if (appointment.patientId._id.toString() !== user.userId && 
        appointment.doctorId._id.toString() !== user.userId && 
        user.role !== 'admin') {
      return res.status(403).json(
        responseBody(403, 'Forbidden: You do not have permission to view this appointment', null)
      );
    }

    const appointmentData = {
      appointmentId: appointment._id,
      patientId: appointment.patientId,
      doctorId: appointment.doctorId,
      scheduledFor: appointment.scheduledFor,
      date: appointment.date,
      time: appointment.time,
      reason: appointment.reason,
      status: appointment.status
    };

    // Async cache set
    setImmediate(() => {
      cacheService.setShort(cacheKey, appointmentData);
    });

    return res.status(200).json(
      responseBody(200, 'Appointment retrieved successfully', appointmentData)
    );
  } catch (error) {
    console.error('Error retrieving appointment:', error);
    if (error.name === 'CastError') {
      return res.status(400).json(
        responseBody(400, 'Validation error: Invalid appointmentId format', null)
      );
    }
    return res.status(500).json(
      responseBody(500, 'Internal Server Error: Unable to retrieve appointment', null)
    );
  }
};

module.exports = {
  bookAppointment,
  getAppointments,
  getAppointmentById,
  getAppointmentsByIds,
  bulkUpdateAppointments
};