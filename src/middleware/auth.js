const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const authenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Decoded token:", decoded); // Add this for debugging
    
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { department: true }
    });

    console.log("Found user:", { id: user?.id, role: user?.role }); // Debug log

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Invalid token.' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("Auth error:", error);
    res.status(401).json({ error: 'Invalid token.' });
  }
};

const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // Flatten the array if needed
    const roles = allowedRoles.flat();
    
    console.log("Authorize check:", {
      userRole: req.user?.role,
      allowedRoles: roles,
      hasAccess: roles.includes(req.user?.role)
    });

    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Access denied. Insufficient permissions.',
        required: roles,
        current: req.user.role
      });
    }
    next();
  };
};

module.exports = { authenticate, authorize };