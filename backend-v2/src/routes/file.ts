import { Router } from 'express';
import multer from 'multer';
import { FileController } from '../controllers/FileController.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { uploadFileSchema, uuidParamSchema } from '../shared/validation.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
});

export function createFileRoutes(controller: FileController): Router {
  const router = Router();

  router.use(authenticate);

  // Upload file
  router.post(
    '/',
    upload.single('file'),
    validate(uploadFileSchema),
    controller.upload
  );

  // Get download URL
  router.get('/:id/download', validate(uuidParamSchema), controller.getDownloadUrl);

  // Delete file
  router.delete('/:id', validate(uuidParamSchema), controller.delete);

  return router;
}
