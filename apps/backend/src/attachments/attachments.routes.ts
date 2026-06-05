import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import multer from 'multer';

import { AppError } from '../errors/AppError.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireAuth, requireAnyRole, requireRole } from '../middleware/authMiddleware.js';
import { validateRequest } from '../validation/requestValidation.js';
import { MAX_FILE_BYTES } from './attachments.constants.js';
import {
  attachmentSignedUrlController,
  deleteAttachmentController,
  linkAttachmentsController,
  listAttachmentsController,
  uploadAttachmentController,
} from './attachments.controller.js';
import {
  attachmentIdSchema,
  linkAttachmentsSchema,
  listAttachmentsSchema,
} from './attachments.validation.js';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_BYTES, files: 1 },
});

// Wrap multer so its limit/parse errors become clean Hebrew AppErrors instead of
// leaking a generic 500. Applied only on the upload route (app stays JSON-only).
function uploadSingle(request: Request, response: Response, next: NextFunction) {
  upload.single('file')(request, response, (err: unknown) => {
    if (err) {
      if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return next(new AppError('הקובץ גדול מדי. ניתן לצרף קבצים עד 10MB.', 422));
      }
      return next(new AppError('שגיאה בהעלאת הקובץ.', 400));
    }
    return next();
  });
}

export const attachmentsRouter = Router();

attachmentsRouter.use(requireAuth);

// POST /api/attachments — student uploads a draft file (multipart 'file').
attachmentsRouter.post('/', requireRole('student'), uploadSingle, asyncHandler(uploadAttachmentController));

// POST /api/attachments/link — link drafts to a booking the student owns.
attachmentsRouter.post(
  '/link',
  requireRole('student'),
  validateRequest(linkAttachmentsSchema),
  asyncHandler(linkAttachmentsController),
);

// GET /api/attachments?booking_request_id=|lesson_id= — list metadata (parties only).
attachmentsRouter.get(
  '/',
  requireAnyRole(['student', 'teacher', 'admin']),
  validateRequest(listAttachmentsSchema),
  asyncHandler(listAttachmentsController),
);

// GET /api/attachments/:id/signed-url — short-lived signed download URL (parties only).
attachmentsRouter.get(
  '/:id/signed-url',
  requireAnyRole(['student', 'teacher', 'admin']),
  validateRequest(attachmentIdSchema),
  asyncHandler(attachmentSignedUrlController),
);

// DELETE /api/attachments/:id — remove a draft before submit (uploader only).
attachmentsRouter.delete(
  '/:id',
  requireRole('student'),
  validateRequest(attachmentIdSchema),
  asyncHandler(deleteAttachmentController),
);
