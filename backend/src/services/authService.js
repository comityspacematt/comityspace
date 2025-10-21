const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/database');

class AuthService {
  // Hash password
  static async hashPassword(password) {
    const saltRounds = 12;
    return await bcrypt.hash(password, saltRounds);
  }

  // Compare password
  static async comparePassword(password, hashedPassword) {
    return await bcrypt.compare(password, hashedPassword);
  }

  // Generate JWT tokens
  static generateTokens(user, userType = 'user') {
    const payload = {
      userId: user.id,
      email: user.email,
      userType: userType, // 'super_admin', 'nonprofit_admin', 'volunteer'
      role: user.role,
      organizationId: user.organizationId || user.organization_id,
      organizationName: user.organizationName || user.organization_name
    };

    const accessToken = jwt.sign(
      payload,
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE || '15m' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id, userType: userType },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_REFRESH_EXPIRE || '7d' }
    );

    return { accessToken, refreshToken };
  }

  // Verify JWT token
  static verifyToken(token) {
    try {
      return jwt.verify(token, process.env.JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  // Check if email is whitelisted for any organization
  static async isEmailWhitelisted(email) {
    const result = await db.query(`
      SELECT w.id, w.email, w.role, w.organization_id, o.name as organization_name, o.shared_password_hash
      FROM whitelisted_emails w
      JOIN organizations o ON w.organization_id = o.id
      WHERE w.email = $1 AND w.is_active = true AND o.is_active = true
    `, [email.toLowerCase()]);

    if (result.rows.length === 0) {
      return { allowed: false, message: 'Email not found in any organization whitelist' };
    }

    return { 
      allowed: true, 
      whitelist: result.rows[0],
      message: 'Email is whitelisted'
    };
  }

  // Super Admin login (individual password)
  static async superAdminLogin(email, password) {
    try {
      console.log('🔐 Super Admin Login Attempt:', email);
      const result = await db.query(`
        SELECT * FROM super_admins
        WHERE email = $1 AND is_active = true
      `, [email.toLowerCase()]);

      console.log('Super admin query result rows:', result.rows.length);

      if (result.rows.length === 0) {
        console.log('❌ No super admin found for email:', email);
        throw new Error('Invalid email or password');
      }

      const superAdmin = result.rows[0];
      console.log('✅ Super admin found, checking password...');

      // Check password
      const isValidPassword = await this.comparePassword(password, superAdmin.password_hash);
      console.log('Password valid:', isValidPassword);

      if (!isValidPassword) {
        console.log('❌ Password does not match for super admin');
        throw new Error('Invalid email or password');
      }

      console.log('✅ Super admin password validated successfully');

      // Update last login
      await db.query(
        'UPDATE super_admins SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [superAdmin.id]
      );

      // Generate tokens
      const tokens = this.generateTokens(superAdmin, 'super_admin');

      return {
        success: true,
        userType: 'super_admin',
        user: {
          id: superAdmin.id,
          email: superAdmin.email,
          firstName: superAdmin.first_name,
          lastName: superAdmin.last_name,
          role: 'super_admin'
        },
        tokens,
        message: 'Super admin login successful'
      };

    } catch (error) {
      throw error;
    }
  }

  // Organization login (shared password)
  static async organizationLogin(email, password) {
    try {
      // Check if email is whitelisted
      const emailCheck = await this.isEmailWhitelisted(email);
      if (!emailCheck.allowed) {
        throw new Error(emailCheck.message);
      }

      const whitelist = emailCheck.whitelist;

      // Check shared organization password
      const isValidPassword = await this.comparePassword(password, whitelist.shared_password_hash);
      if (!isValidPassword) {
        throw new Error('Invalid organization password');
      }

      // Find user record (should already exist since it's created when volunteer is added)
      let user = await db.query(`
        SELECT * FROM users
        WHERE email = $1 AND organization_id = $2
      `, [email.toLowerCase(), whitelist.organization_id]);

      if (user.rows.length === 0) {
        // User should exist, but if not, create with basic info
        console.warn(`User ${email} not found, creating basic record (should have been created when added to whitelist)`);

        const createResult = await db.query(`
          INSERT INTO users (email, organization_id, role, login_count, first_name, last_name)
          VALUES ($1, $2, $3, 1, NULL, NULL)
          RETURNING *
        `, [email.toLowerCase(), whitelist.organization_id, whitelist.role]);

        user = createResult;
      } else {
        // User exists, just update login info
        const currentUser = user.rows[0];
        const updateResult = await db.query(`
          UPDATE users
          SET last_login = CURRENT_TIMESTAMP, login_count = login_count + 1
          WHERE id = $1
          RETURNING *
        `, [currentUser.id]);

        // Use the updated user data instead of the old one
        user = updateResult;
      }

      const userData = user.rows[0];

      // Determine user type
      const userType = whitelist.role === 'nonprofit_admin' ? 'nonprofit_admin' : 'volunteer';

      // Generate tokens
      const tokens = this.generateTokens({
        id: userData.id,
        email: userData.email,
        role: userData.role,
        organizationId: whitelist.organization_id,
        organizationName: whitelist.organization_name
      }, userType);

      return {
        success: true,
        userType: userType,
        user: {
          id: userData.id,
          email: userData.email,
          firstName: userData.first_name,
          lastName: userData.last_name,
          phone: userData.phone,
          address: userData.address,
          birthDate: userData.birth_date,
          role: userData.role,
          organizationId: whitelist.organization_id,
          organizationName: whitelist.organization_name,
          profileCompleted: userData.profile_completed,
          loginCount: userData.login_count
        },
        tokens,
        message: `${userType === 'nonprofit_admin' ? 'Admin' : 'Volunteer'} login successful`
      };

    } catch (error) {
      throw error;
    }
  }

  // Universal login method
  static async login(email, password) {
    try {
      // First try super admin login
      try {
        const superAdminResult = await this.superAdminLogin(email, password);
        return superAdminResult;
      } catch (superAdminError) {
        // If super admin login fails, try organization login
        const orgResult = await this.organizationLogin(email, password);
        return orgResult;
      }

    } catch (error) {
      throw new Error('Invalid email or password');
    }
  }

  // Get user by ID and type
  static async getUserById(userId, userType = 'user') {
    try {
      if (userType === 'super_admin') {
        const result = await db.query(`
          SELECT id, email, first_name, last_name, last_login
          FROM super_admins 
          WHERE id = $1 AND is_active = true
        `, [userId]);

        if (result.rows.length === 0) return null;

        const user = result.rows[0];
        return {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          role: 'super_admin',
          userType: 'super_admin',
          lastLogin: user.last_login
        };
      } else {
        // Regular user or nonprofit admin
        const result = await db.query(`
          SELECT u.*, o.name as organization_name
          FROM users u
          JOIN organizations o ON u.organization_id = o.id
          WHERE u.id = $1
        `, [userId]);

        if (result.rows.length === 0) return null;

        const user = result.rows[0];
        return {
          id: user.id,
          email: user.email,
          firstName: user.first_name,
          lastName: user.last_name,
          phone: user.phone,
          address: user.address,
          birthDate: user.birth_date,
          role: user.role,
          organizationId: user.organization_id,
          organizationName: user.organization_name,
          profileCompleted: user.profile_completed,
          userType: user.role === 'nonprofit_admin' ? 'nonprofit_admin' : 'volunteer',
          lastLogin: user.last_login
        };
      }
    } catch (error) {
      throw error;
    }
  }

  // Refresh access token
  static async refreshAccessToken(refreshToken) {
    try {
      const decoded = this.verifyToken(refreshToken);
      const user = await this.getUserById(decoded.userId, decoded.userType);
      
      if (!user) {
        throw new Error('User not found');
      }

      const tokens = this.generateTokens(user, decoded.userType);
      return {
        success: true,
        tokens,
        user
      };

    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  // Get all organizations (for super admin dropdown)
  static async getAllOrganizations() {
    const result = await db.query(`
      SELECT id, name, description, is_active, created_at,
             (SELECT COUNT(*) FROM whitelisted_emails WHERE organization_id = organizations.id AND is_active = true) as user_count
      FROM organizations 
      WHERE is_active = true
      ORDER BY name
    `);

    return result.rows;
  }

  // Update organization password (admin only)
  static async updateOrganizationPassword(organizationId, newPassword, adminUserId) {
    try {
      const hashedPassword = await this.hashPassword(newPassword);
      
      await db.query(`
        UPDATE organizations 
        SET shared_password_hash = $1, updated_at = CURRENT_TIMESTAMP 
        WHERE id = $2
      `, [hashedPassword, organizationId]);

      return { success: true, message: 'Organization password updated successfully' };
    } catch (error) {
      throw error;
    }
  }
}

module.exports = AuthService;