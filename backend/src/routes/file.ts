import { Router } from 'express';
import { FileController } from '../controllers/FileController';
import { authenticateToken } from '../middleware/auth';
import { requireRole } from '../middleware/roleMiddleware';

const router = Router();

// All file routes require authentication
router.use(authenticateToken);

// Upload files
router.post(
  '/upload',
  FileController.getUploadMiddleware().array('files', 5), // Allow up to 5 files
  FileController.uploadFiles
);

// Get files by related entity (inquiry or order)
router.get(
  '/:relatedType/:relatedId',
  FileController.getFilesByRelated
);

// Get file information
router.get(
  '/info/:fileId',
  FileController.getFileInfo
);

// Delete file (only file uploader or admin)
router.delete(
  '/:fileId',
  FileController.deleteFile
);

// Serve file (public access for file serving)
router.get(
  '/serve/:filename',
  FileController.serveFile
);

// Download file (authenticated)
router.get(
  '/download/:fileId',
  FileController.downloadFile
);

export default router;