const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'yum_yum_billing_super_secure_jwt_secret_key_change_in_production';

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. Authentication token missing.'
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.account = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Session expired or invalid token. Please log in again.'
    });
  }
}

function generateToken(account) {
  return jwt.sign(
    {
      id: account.id,
      username: account.username,
      email: account.email,
      cafe_name: account.cafe_name
    },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

module.exports = {
  authenticateToken,
  generateToken,
  JWT_SECRET
};
