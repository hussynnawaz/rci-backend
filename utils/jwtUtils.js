import jwt from 'jsonwebtoken';

// Generate JWT token
export const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Generate token and set cookie
export const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  // Create token
  const token = generateToken(user._id);

  const options = {
    expires: new Date(
      Date.now() + (parseInt(process.env.JWT_COOKIE_EXPIRE) || 7) * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production', // Use secure cookies in production
    sameSite: 'strict'
  };

  // Remove password from output
  const userResponse = { ...user._doc };
  delete userResponse.password;

  res
    .status(statusCode)
    .cookie('token', token, options)
    .json({
      success: true,
      message,
      token,
      user: userResponse
    });
};

// Verify JWT token
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid token');
  }
};

// Generate password reset token
export const generatePasswordResetToken = () => {
  const resetToken = jwt.sign(
    { purpose: 'password_reset', timestamp: Date.now() },
    process.env.JWT_SECRET,
    { expiresIn: '10m' } // 10 minutes
  );
  return resetToken;
};

// Generate email verification token
export const generateVerificationToken = () => {
  const verificationToken = jwt.sign(
    { purpose: 'email_verification', timestamp: Date.now() },
    process.env.JWT_SECRET,
    { expiresIn: '24h' } // 24 hours
  );
  return verificationToken;
};
