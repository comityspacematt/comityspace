const AuthService = require('../services/authService');

// Middleware to verify JWT token
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log('🔐 Auth request:', {
      path: req.path,
      method: req.method,
      hasToken: !!token,
      tokenPreview: token ? token.substring(0, 10) + '...' : 'none'
    });

    if (!token) {
      console.log('❌ No token provided');
      return res.status(401).json({
        error: 'Access denied',
        message: 'No token provided'
      });
    }

    // Verify token
    const decoded = AuthService.verifyToken(token);

    // Get fresh user data
    const user = await AuthService.getUserById(decoded.userId, decoded.userType);
    if (!user) {
      console.log('❌ User not found:', { userId: decoded.userId, userType: decoded.userType });
      return res.status(401).json({
        error: 'Access denied',
        message: 'User not found'
      });
    }

    console.log('✅ Authentication successful:', {
      userId: user.id,
      userType: decoded.userType,
      organizationId: user.organizationId
    });

    // Add user info to request
    req.user = user;
    req.userType = decoded.userType;
    req.organizationId = user.organizationId;

    next();

  } catch (error) {
    console.error('❌ Auth error:', error.message);
    return res.status(401).json({
      error: 'Access denied',
      message: 'Invalid or expired token'
    });
  }
};

// Middleware to require super admin access
const requireSuperAdmin = (req, res, next) => {
  if (req.userType !== 'super_admin') {
    return res.status(403).json({ 
      error: 'Forbidden', 
      message: 'Super admin access required' 
    });
  }
  next();
};

// Middleware to require nonprofit admin access
const requireNonprofitAdmin = (req, res, next) => {
  if (req.userType !== 'nonprofit_admin' && req.userType !== 'super_admin') {
    return res.status(403).json({ 
      error: 'Forbidden', 
      message: 'Admin access required' 
    });
  }
  next();
};

// Middleware to require volunteer or higher access
const requireVolunteer = (req, res, next) => {
  if (!['volunteer', 'nonprofit_admin', 'super_admin'].includes(req.userType)) {
    return res.status(403).json({ 
      error: 'Forbidden', 
      message: 'User access required' 
    });
  }
  next();
};

// Middleware to ensure user belongs to the same organization (except super admin)
const requireSameOrganization = (req, res, next) => {
  if (req.userType === 'super_admin') {
    // Super admins can access any organization
    // They can optionally specify an organization via query param
    req.targetOrganizationId = req.query.orgId || req.organizationId;
  } else {
    // Regular users can only access their own organization
    req.targetOrganizationId = req.organizationId;
  }
  next();
};

// Optional authentication (for public/semi-public routes)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = AuthService.verifyToken(token);
      const user = await AuthService.getUserById(decoded.userId, decoded.userType);
      if (user) {
        req.user = user;
        req.userType = decoded.userType;
        req.organizationId = user.organizationId;
      }
    }
    
    next();
  } catch (error) {
    // Continue without authentication for optional routes
    next();
  }
};

// Middleware to handle organization context for super admins
const handleOrganizationContext = (req, res, next) => {
  if (req.userType === 'super_admin') {
    // Super admin can specify which org they're working with
    const orgId = req.params.orgId || req.query.orgId || req.body.organizationId;
    if (orgId) {
      req.targetOrganizationId = parseInt(orgId);
    }
  } else {
    // Regular users always work within their own organization
    req.targetOrganizationId = req.organizationId;
  }
  next();
};

// Middleware to validate organization access
const validateOrganizationAccess = async (req, res, next) => {
  try {
    if (req.userType === 'super_admin') {
      // Super admins have access to all organizations
      next();
      return;
    }

    const targetOrgId = req.targetOrganizationId || req.params.orgId;
    
    if (!targetOrgId) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Organization context required'
      });
    }

    // Check if user belongs to the target organization
    if (req.organizationId !== parseInt(targetOrgId)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Access denied to this organization'
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to validate organization access'
    });
  }
};

module.exports = {
  authenticateToken,
  requireSuperAdmin,
  requireNonprofitAdmin,
  requireVolunteer,
  requireSameOrganization,
  optionalAuth,
  handleOrganizationContext,
  validateOrganizationAccess
};