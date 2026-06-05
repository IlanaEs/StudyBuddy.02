import { z } from 'zod';

import { MAX_FILES_PER_BOOKING } from './attachments.constants.js';

// ── POST /api/attachments/link ────────────────────────────────────────────────

const linkBodySchema = z.object({
  booking_request_id: z.string().uuid(),
  attachment_ids: z.array(z.string().uuid()).min(1).max(MAX_FILES_PER_BOOKING),
});

export const linkAttachmentsSchema = z.object({ body: linkBodySchema });
export type LinkAttachmentsBody = z.infer<typeof linkBodySchema>;

// ── GET /api/attachments?booking_request_id=|lesson_id= ───────────────────────

const listQuerySchema = z
  .object({
    booking_request_id: z.string().uuid().optional(),
    lesson_id: z.string().uuid().optional(),
  })
  .refine((q) => !!q.booking_request_id !== !!q.lesson_id, {
    message: 'Provide exactly one of booking_request_id or lesson_id',
  });

export const listAttachmentsSchema = z.object({ query: listQuerySchema });
export type ListAttachmentsQuery = z.infer<typeof listQuerySchema>;

// ── :id param ─────────────────────────────────────────────────────────────────

export const attachmentIdSchema = z.object({ params: z.object({ id: z.string().uuid() }) });
