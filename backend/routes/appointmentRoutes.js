const { Router } = require('express');
const { verifyToken } = require('../middleware/authmiddleware/Jwt');
const { authorizeRoles } = require('../middleware/rolemiddleware/role');
const {
  bookAppointment,
  getAppointments,
  getAppointmentById,
  cancelAppointment,
  rescheduleAppointment,
  noShowAppointment,
  deleteAppointment
} = require('../controllers/appointmentController');

const router = Router();

// Apply authentication middleware to all routes
router.use(verifyToken);

// Appointment booking - Only patients can book
router.post(
  '/book',
  authorizeRoles('patient'),
  bookAppointment
);

// Get all appointments - Accessible by patients, doctors, and admins
router.get(
  '/',
  authorizeRoles('patient', 'doctor', 'admin'),
  getAppointments
);

// Get specific appointment by ID - Accessible by patients, doctors, and admins
router.get(
  '/:appointmentId',
  authorizeRoles('patient', 'doctor', 'admin'),
  getAppointmentById
);

// Cancel appointment - Accessible by patients, doctors, and admins
router.put(
  '/cancel/:appointmentId',
  authorizeRoles('patient', 'doctor', 'admin'),
  cancelAppointment
);

// Reschedule appointment - Accessible by patients, doctors, and admins
router.put(
  '/reschedule/:appointmentId',
  authorizeRoles('patient', 'doctor', 'admin'),
  rescheduleAppointment
);

// Mark appointment as no-show - Only doctors and admins
router.put(
  '/no-show/:appointmentId',
  authorizeRoles('doctor', 'admin'),
  noShowAppointment
);

// Delete appointment - Only admins
router.delete(
  '/:appointmentId',
  authorizeRoles('admin'),
  deleteAppointment
);

// Health check endpoint for appointments service
router.get(
  '/health',
  (req, res) => {
    res.status(200).json({
      status: 'healthy',
      service: 'appointments',
      timestamp: new Date().toISOString()
    });
  }
);

// Cache statistics endpoint (for monitoring) - Only admins
router.get(
  '/admin/cache-stats',
  authorizeRoles('admin'),
  (req, res) => {
    try {
      const cacheService = require('../services/cacheService');
      const stats = cacheService.getMemoryInfo();
      res.status(200).json({
        status: 'success',
        data: stats,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error fetching cache stats:', error);
      res.status(500).json({
        status: 'error',
        message: 'Unable to fetch cache statistics'
      });
    }
  }
);

// Clear cache endpoint (for maintenance) - Only admins
router.post(
  '/admin/clear-cache',
  authorizeRoles('admin'),
  (req, res) => {
    try {
      const cacheService = require('../services/cacheService');
      const { pattern } = req.body;
      
      if (pattern) {
        const deleted = cacheService.clearPattern(pattern);
        res.status(200).json({
          status: 'success',
          message: `Cleared cache entries matching pattern: ${pattern}`,
          deletedCount: deleted
        });
      } else {
        cacheService.flushAll();
        res.status(200).json({
          status: 'success',
          message: 'All cache entries cleared'
        });
      }
    } catch (error) {
      console.error('Error clearing cache:', error);
      res.status(500).json({
        status: 'error',
        message: 'Unable to clear cache'
      });
    }
  }
);

module.exports = router;



// Caching service implementation
const NodeCache = require('node-cache');

class CacheService {
  constructor() {
    this.shortTermCache = new NodeCache({ stdTTL: 300 }); // 5 minutes
    this.mediumTermCache = new NodeCache({ stdTTL: 900 }); // 15 minutes
    this.longTermCache = new NodeCache({ stdTTL: 3600 }); // 1 hour
  }

  // Get appointments with caching
  async getAppointments(userId, userRole) {
    const cacheKey = `appointments_${userId}_${userRole}`;
    let appointments = this.mediumTermCache.get(cacheKey);
    
    if (!appointments) {
      appointments = await this.fetchAppointmentsFromDB(userId, userRole);
      this.mediumTermCache.set(cacheKey, appointments);
    }
    
    return appointments;
  }

  // Invalidate cache on data updates
  invalidateAppointmentCache(userId) {
    const keys = this.mediumTermCache.keys();
    keys.forEach(key => {
      if (key.includes(`appointments_${userId}`)) {
        this.mediumTermCache.del(key);
      }
    });
  }
}