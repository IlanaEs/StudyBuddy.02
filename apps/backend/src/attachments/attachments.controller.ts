import type { Request, Response } from 'express';

import { AppError } from '../errors/AppError.js';
import {
  deleteDraftAttachment,
  getAttachmentSignedUrl,
  linkAttachmentsToBooking,
  listAttachments,
  uploadDraftAttachment,
} from './attachments.service.js';
import type { LinkAttachmentsBody, ListAttachmentsQuery } from './attachments.validation.js';

export async function uploadAttachmentController(request: Request, response: Response) {
  const file = request.file;
  if (!file) throw new AppError('לא נשלח קובץ.', 400);

  const attachment = await uploadDraftAttachment(request.auth!.user, {
    buffer: file.buffer,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  });

  response.status(201).json({ data: { attachment } });
}

export async function linkAttachmentsController(request: Request, response: Response) {
  const body = request.body as LinkAttachmentsBody;
  const result = await linkAttachmentsToBooking(request.auth!.user, body.booking_request_id, body.attachment_ids);
  response.status(200).json({ data: result });
}

export async function listAttachmentsController(request: Request, response: Response) {
  const query = request.query as unknown as ListAttachmentsQuery;
  const attachments = await listAttachments(request.auth!.user, {
    bookingRequestId: query.booking_request_id,
    lessonId: query.lesson_id,
  });
  response.status(200).json({ data: { attachments } });
}

export async function attachmentSignedUrlController(request: Request, response: Response) {
  const id = request.params['id'] as string;
  const url = await getAttachmentSignedUrl(request.auth!.user, id);
  response.status(200).json({ data: { url } });
}

export async function deleteAttachmentController(request: Request, response: Response) {
  const id = request.params['id'] as string;
  await deleteDraftAttachment(request.auth!.user, id);
  response.status(200).json({ data: { deleted: true } });
}
