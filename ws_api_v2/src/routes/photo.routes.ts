import { Router } from 'express';
import photoController from '../controllers/photo.controller';
import { authenticate } from '../middleware/auth.middleware';
import { validate } from '../middleware/validate.middleware';
import { singlePhoto, multiplePhotos } from '../middleware/upload.middleware';
import {
  listPhotosSchema,
  uploadPhotoSchema,
  updatePhotoSchema,
  moderatePhotoSchema,
  photoIdParamSchema,
  weddingIdParamSchema,
} from '../schemas/photo.schema';

// ─── Rutas anidadas bajo /api/weddings/:weddingId/photos ─────────
export const weddingPhotoRouter = Router({ mergeParams: true });
weddingPhotoRouter.use(authenticate);

weddingPhotoRouter.get('/', validate(listPhotosSchema), photoController.getAll);
weddingPhotoRouter.get('/stats', validate(weddingIdParamSchema), photoController.getStats);

// Upload foto única: multipart/form-data con campo "photo"
weddingPhotoRouter.post(
  '/',
  singlePhoto,                         // multer procesa el archivo
  validate(uploadPhotoSchema),         // valida campos de texto
  photoController.upload,
);

// Upload batch: multipart/form-data con campo "photos" (array)
weddingPhotoRouter.post(
  '/batch',
  multiplePhotos,                      // multer procesa hasta 10 archivos
  validate(weddingIdParamSchema),
  photoController.uploadBatch,
);

// ─── Rutas standalone bajo /api/photos ──────────────────────────
export const photoRouter = Router();
photoRouter.use(authenticate);

photoRouter.get('/:photoId', validate(photoIdParamSchema), photoController.getById);
photoRouter.patch('/:photoId', validate(updatePhotoSchema), photoController.update);
photoRouter.patch('/:photoId/moderate', validate(moderatePhotoSchema), photoController.moderate);
photoRouter.delete('/:photoId', validate(photoIdParamSchema), photoController.remove);