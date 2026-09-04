const jwt = require('jsonwebtoken');
require('dotenv').config();

// Verifies the JWT and attaches { id, role } to req.user
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <token>"

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token' });
    }
    req.user = decoded; // { id, role }
    next();
  });
}

// Restricts a route to specific roles, e.g. requireRole('admin')
function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Access denied for this role' });
    }
    next();
  };
}

module.exports = { verifyToken, requireRole };
