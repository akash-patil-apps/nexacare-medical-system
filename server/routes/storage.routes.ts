// server/routes/storage.routes.ts
import { Router } from 'express';
import { authenticateToken, authorizeRoles, type AuthenticatedRequest } from '../middleware/auth';
import { storageService } from '../services/storage.service';
import { upload } from '../services/fileUpload.service';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * POST /api/storage/upload
 * Upload a file
 */
router.post('/upload', authorizeRoles('ADMIN', 'HOSPITAL', 'DOCTOR', 'LAB', 'RADIOLOGY_TECHNICIAN', 'NURSE', 'RECEPTIONIST'), upload.single('file'), async (req: AuthenticatedRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const folder = req.body.folder || 'general'; // Optional folder parameter

    const uploadResult = await storageService.uploadFile({
      file: req.file.buffer,
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      folder,
    });

    res.json({
      success: true,
      file: {
        url: uploadResult.url,
        key: uploadResult.key,
        filename: req.file.originalname,
        size: uploadResult.size,
        mimetype: uploadResult.mimetype,
        uploadedAt: uploadResult.uploadedAt,
      },
    });
  } catch (err: any) {
    console.error('❌ File upload error:', err);
    res.status(400).json({
      message: err.message || 'Failed to upload file',
      error: err.toString(),
    });
  }
});

/**
 * GET /api/storage/files/:key
 * Get file (for local storage mock)
 */
router.get('/files/:key', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { key } = req.params;

    const file = await storageService.getFile(key);

    if (!file) {
      return res.status(404).json({ message: 'File not found' });
    }

    res.setHeader('Content-Type', file.metadata.mimetype);
    res.setHeader('Content-Disposition', `inline; filename="${file.metadata.filename}"`);
    res.send(file.data);
  } catch (err: any) {
    console.error('❌ Get file error:', err);
    res.status(400).json({
      message: err.message || 'Failed to get file',
    });
  }
});

/**
 * DELETE /api/storage/files/:key
 * Delete a file
 */
router.delete('/files/:key', authorizeRoles('ADMIN', 'HOSPITAL'), async (req: AuthenticatedRequest, res) => {
  try {
    const { key } = req.params;

    const deleted = await storageService.deleteFile(key);

    if (!deleted) {
      return res.status(404).json({ message: 'File not found or could not be deleted' });
    }

    res.json({
      success: true,
      message: 'File deleted successfully',
    });
  } catch (err: any) {
    console.error('❌ Delete file error:', err);
    res.status(400).json({
      message: err.message || 'Failed to delete file',
    });
  }
});

export default router;
