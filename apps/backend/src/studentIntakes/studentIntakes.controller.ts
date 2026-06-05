import type { Request, Response } from 'express';

import { createIntake, getMyLatestIntake } from './studentIntakes.service.js';
import type { CreateIntakeBody } from './studentIntakes.validation.js';

export async function createIntakeController(request: Request, response: Response) {
  const body = request.body as CreateIntakeBody;
  const currentUser = request.auth!.user;

  const intake = await createIntake(body, currentUser);

  response.status(201).json({
    data: {
      intake_id: intake.id,
      student_id: intake.studentId,
      subject_id: intake.subjectId,
      status: intake.status,
    },
  });
}

export async function getMyLatestIntakeController(request: Request, response: Response) {
  const intake = await getMyLatestIntake(request.auth!.user);
  response.status(200).json({ data: { intake } });
}
