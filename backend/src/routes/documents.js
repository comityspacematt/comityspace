const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { authenticateToken, requireNonprofitAdmin, requireVolunteer } = require('../middleware/auth');

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const orgDir = path.join(uploadsDir, `org_${req.organizationId}`);
    if (!fs.existsSync(orgDir)) {
      fs.mkdirSync(orgDir, { recursive: true });
    }
    cb(null, orgDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename with timestamp
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Allowed file types
  const allowedTypes = [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'image/jpeg',
    'image/png',
    'image/gif'
  ];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, Word, Excel, text, and image files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// All routes require authentication
router.use(authenticateToken);

// GET /api/documents - Get all documents for organization
router.get('/', requireVolunteer, async (req, res) => {
  try {
    const organizationId = req.organizationId;
    const userType = req.userType;

    let whereClause = 'WHERE d.organization_id = $1';
    const params = [organizationId];

    // Filter by visibility based on user type
    if (userType === 'volunteer') {
      whereClause += " AND (d.visibility = 'all' OR d.visibility = 'volunteers_only')";
    }
    // Admins can see all documents

    const documentsQuery = `
      SELECT d.*,
             u.first_name as uploader_name,
             u.last_name as uploader_lastname
      FROM documents d
      LEFT JOIN users u ON d.uploaded_by = u.id
      ${whereClause}
      ORDER BY d.is_pinned DESC, d.created_at DESC
    `;

    const documents = await require('../config/database').query(documentsQuery, params);

    res.json({
      success: true,
      documents: documents.rows.map(doc => ({
        ...doc,
        file_size_mb: (doc.file_size / (1024 * 1024)).toFixed(2)
      }))
    });

  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to get documents'
    });
  }
});

// POST /api/documents - Upload new document (Admin only)
router.post('/', requireNonprofitAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'File is required'
      });
    }

    const {
      title,
      description = '',
      category = 'general',
      visibility = 'all',
      is_pinned = false
    } = req.body;

    const organizationId = req.organizationId;
    const uploadedBy = req.user.id;

    // Validate required fields
    if (!title) {
      // Delete uploaded file if validation fails
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: 'Validation error',
        message: 'Document title is required'
      });
    }

    // Store relative path from uploads directory
    const relativePath = path.relative(uploadsDir, req.file.path);

    const insertQuery = `
      INSERT INTO documents (
        title, description, file_name, file_path, file_size, file_type,
        category, visibility, is_pinned, uploaded_by, organization_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;

    const values = [
      title,
      description,
      req.file.originalname,
      relativePath,
      req.file.size,
      req.file.mimetype,
      category,
      visibility,
      is_pinned === 'true',
      uploadedBy,
      organizationId
    ];

    const result = await require('../config/database').query(insertQuery, values);

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      document: {
        ...result.rows[0],
        file_size_mb: (result.rows[0].file_size / (1024 * 1024)).toFixed(2)
      }
    });

  } catch (error) {
    console.error('Upload document error:', error);
    
    // Delete uploaded file if database operation fails
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        error: 'File too large',
        message: 'File size must be less than 10MB'
      });
    }

    res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'Failed to upload document'
    });
  }
});

// GET /api/documents/:id/download - Download document
router.get('/:id/download', requireVolunteer, async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.organizationId;
    const userType = req.userType;

    let whereClause = 'WHERE d.id = $1 AND d.organization_id = $2';
    const params = [id, organizationId];

    // Check visibility permissions
    if (userType === 'volunteer') {
      whereClause += " AND (d.visibility = 'all' OR d.visibility = 'volunteers_only')";
    }

    const documentQuery = `
      SELECT d.* FROM documents d ${whereClause}
    `;

    const result = await require('../config/database').query(documentQuery, params);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Document not found or access denied'
      });
    }

    const document = result.rows[0];
    const filePath = path.join(uploadsDir, document.file_path);

    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        error: 'File not found',
        message: 'Document file is missing from server'
      });
    }

    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${document.file_name}"`);
    res.setHeader('Content-Type', document.file_type);

    // Stream the file
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

  } catch (error) {
    console.error('Download document error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to download document'
    });
  }
});

// PUT /api/documents/:id - Update document metadata (Admin only)
router.put('/:id', requireNonprofitAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, category, visibility, is_pinned } = req.body;
    const organizationId = req.organizationId;

    const updateQuery = `
      UPDATE documents 
      SET title = COALESCE($1, title),
          description = COALESCE($2, description),
          category = COALESCE($3, category),
          visibility = COALESCE($4, visibility),
          is_pinned = COALESCE($5, is_pinned),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6 AND organization_id = $7
      RETURNING *
    `;

    const result = await require('../config/database').query(updateQuery, [
      title, description, category, visibility, is_pinned, id, organizationId
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Document not found'
      });
    }

    res.json({
      success: true,
      message: 'Document updated successfully',
      document: result.rows[0]
    });

  } catch (error) {
    console.error('Update document error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to update document'
    });
  }
});

// DELETE /api/documents/:id - Delete document (Admin only)
router.delete('/:id', requireNonprofitAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const organizationId = req.organizationId;

    // Get document info before deleting
    const documentQuery = `
      SELECT * FROM documents 
      WHERE id = $1 AND organization_id = $2
    `;

    const docResult = await require('../config/database').query(documentQuery, [id, organizationId]);

    if (docResult.rows.length === 0) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Document not found'
      });
    }

    const document = docResult.rows[0];

    // Delete from database
    const deleteQuery = `
      DELETE FROM documents 
      WHERE id = $1 AND organization_id = $2
      RETURNING title
    `;

    const deleteResult = await require('../config/database').query(deleteQuery, [id, organizationId]);

    // Delete physical file
    const filePath = path.join(uploadsDir, document.file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({
      success: true,
      message: `Document "${deleteResult.rows[0].title}" deleted successfully`
    });

  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Failed to delete document'
    });
  }
});

module.exports = router;