const jwt                = require('jsonwebtoken');
const bcrypt             = require('bcryptjs');
const User               = require('../models/User');
const EmailToken         = require('../models/EmailTokens');
const { responseBody }   = require('../config/responseBody');
const cacheService       = require('../services/cacheService');
const {
  REQUIRED_FIELDS,
  SECRET_KEY,
  JWT: { EXPIRATION: ACCESS_EXPIRATION, REFRESH_EXPIRATION }
} = require('../config/Constants');

const {
  generateAuthTokens,
  verifyRefreshToken,
  revokeRefreshToken,
  generateSecondFactorToken
} = require('../services/authServices');

const registerUser = (sendVerificationCode) => async (req, res) => {
  try {
    const missingFields = REQUIRED_FIELDS.filter(field => !req.body[field]);
    if (missingFields.length) {
      const verb = missingFields.length > 1 ? 'are' : 'is';
      const errorMessage = `Validation error: ${missingFields.join(', ')} ${verb} required or invalid`;
      return res.status(400).json(responseBody(400, errorMessage, null));
    }

    const {
      fullName,
      email,
      password,
      role,
      securityQuestion,
      securityAnswer
    } = req.body;

    const cacheKey = `register_attempt:${email}`;
    const recentAttempt = cacheService.getShort(cacheKey);
    if (recentAttempt) {
      return res.status(429).json(responseBody(429, 'Too many registration attempts. Please wait before trying again.', null));
    }

    if (await User.findOne({ email }).lean()) {
      return res.status(409).json(responseBody(409, 'Email already registered', null));
    }

    const hashedAnswer = await bcrypt.hash(securityAnswer, 10);
    const newUser = new User({
      fullName,
      email,
      password,
      role,
      securityQuestion,
      securityAnswer: hashedAnswer,
      emailVerified: false
    });
    await newUser.save();

    cacheService.setShort(cacheKey, { email, timestamp: Date.now() });

    await sendVerificationCode(newUser);

    return res.status(201).json(
      responseBody(201, 'User registered successfully; verification email sent', {
        ID: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role
      })
    );
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json(responseBody(500, 'Internal Server error', null));
  }
};

const loginStepOne = async (req, res) => {
  try {
    const { email, password } = req.body;

    const failedAttemptKey = `failed_login:${email}`;
    const failedAttempts = cacheService.getShort(failedAttemptKey) || 0;
    
    if (failedAttempts >= 5) {
      return res.status(429).json(responseBody(429, 'Too many failed login attempts. Please try again later.', null));
    }
    const userCacheKey = `user:${email}`;
    let user = cacheService.getMedium(userCacheKey);
    
    if (!user) {
      user = await User.findOne({ email }).lean();
      if (user) {
        // Cache user data for 15 minutes
        cacheService.setMedium(userCacheKey, user);
      }
    }

    if (!user) {
      cacheService.setShort(failedAttemptKey, failedAttempts + 1);
      return res.status(401).json(responseBody(401, 'Invalid email or password', null));
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      cacheService.setShort(failedAttemptKey, failedAttempts + 1);
      return res.status(401).json(responseBody(401, 'Invalid email or password', null));
    }

    if (!user.emailVerified) {
      return res.status(403).json(responseBody(403, 'Email not verified', null));
    }

    cacheService.delete(failedAttemptKey);

    const tempToken = generateSecondFactorToken(user);

    return res.status(200).json(
      responseBody(
        200,
        'Password verified; now answer your security question',
        {
          question: user.securityQuestion,
          tempToken
        }
      )
    );
  } catch (err) {
    console.error('Login Step One error:', err);
    return res.status(500).json(responseBody(500, 'Internal Server error', null));
  }
};

const loginStepTwo = async (req, res) => {
  try {
    const userId = req.userId;
    const { securityAnswer } = req.body;
    const userCacheKey = `user_by_id:${userId}`;
    let user = cacheService.getMedium(userCacheKey);
    
    if (!user) {
      user = await User.findById(userId).lean();
      if (user) {
        cacheService.setMedium(userCacheKey, user);
      }
    }

    if (!user) {
      return res.status(404).json(responseBody(404, 'User not found', null));
    }

    const answerMatch = await bcrypt.compare(securityAnswer, user.securityAnswer);
    if (!answerMatch) {
      return res.status(401).json(responseBody(401, 'Invalid security answer', null));
    }

    const { accessToken, refreshToken, expiresIn } = await generateAuthTokens(user);

    const sessionKey = `session:${userId}`;
    cacheService.setMedium(sessionKey, {
      userId: user._id,
      email: user.email,
      role: user.role,
      loginTime: Date.now()
    });

    return res.status(200).json(
      responseBody(200, 'Login successful', {
        accessToken,
        refreshToken,
        expiresIn,
        user: {
          ID: user._id,
          fullName: user.fullName,
          email: user.email,
          role: user.role
        }
      })
    );
  } catch (err) {
    console.error('Login Step Two error:', err);
    return res.status(500).json(responseBody(500, 'Internal Server error', null));
  }
};

const refreshAccessToken = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      return res.status(400).json(responseBody(400, 'refreshToken is required', null));
    }

    const tokenDoc = await verifyRefreshToken(refreshToken);
    await revokeRefreshToken(refreshToken);

    const userCacheKey = `user_by_id:${tokenDoc.userId}`;
    let user = cacheService.getMedium(userCacheKey);
    
    if (!user) {
      user = await User.findById(tokenDoc.userId).lean();
      if (user) {
        cacheService.setMedium(userCacheKey, user);
      }
    }

    if (!user) {
      return res.status(404).json(responseBody(404, 'User not found', null));
    }

    const { accessToken, refreshToken: newRefreshToken, expiresIn } = await generateAuthTokens(user);

    return res.status(200).json(
      responseBody(200, 'Token refreshed', {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn
      })
    );
  } catch (err) {
    console.error('Refresh error:', err);
    return res.status(401).json(responseBody(401, err.message, null));
  }
};

const logout = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    const { user } = req;

    if (refreshToken) {
      await revokeRefreshToken(refreshToken);
    }

    if (user && user.userId) {
      cacheService.delete(`session:${user.userId}`);
      cacheService.delete(`user_by_id:${user.userId}`);
      cacheService.clearPattern(`appointments:${user.userId}`);
    }

    return res.status(200).json(responseBody(200, 'Logged out', null));
  } catch (err) {
    console.error('Logout error:', err);
    return res.status(500).json(responseBody(500, 'Internal Server error', null));
  }
};

const verifyEmail = async (req, res) => {
  const { token } = req.query;
  if (!token) {
    return res.status(400).json(responseBody(400, 'Verification token is required', null));
  }

  try {
    const emailToken = await EmailToken.findOne({ token }).lean();
    if (!emailToken) {
      return res.status(401).json(responseBody(401, 'Invalid or expired verification token', null));
    }

    const user = await User.findById(emailToken.userId);
    if (!user) {
      return res.status(404).json(responseBody(404, 'User not found', null));
    }

    if (emailToken.verified && user.emailVerified) {
      return res.status(409).json(responseBody(409, 'Email already verified', null));
    }

    user.emailVerified = true;
    await user.save();

    await EmailToken.findByIdAndUpdate(emailToken._id, { verified: true });

    cacheService.delete(`user:${user.email}`);
    cacheService.delete(`user_by_id:${user._id}`);

    return res.status(200).json(responseBody(200, 'Email verified successfully', null));
  } catch (err) {
    console.error('Email verification error:', err);
    return res.status(500).json(responseBody(500, 'Internal Server Error', null));
  }
};

module.exports = {
  registerUser,
  loginStepOne,
  loginStepTwo,
  refreshAccessToken,
  logout,
  verifyEmail
};