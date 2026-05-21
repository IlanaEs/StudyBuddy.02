import type { Request, Response } from 'express';

import {
  getMyOnboarding,
  saveMyOnboarding,
  completeMyOnboarding,
} from './teacherOnboarding.service.js';
import type { SaveOnboardingBody, CompleteOnboardingBody } from './teacherOnboarding.validation.js';

export async function getMyOnboardingController(request: Request, response: Response) {
  const currentUser = request.auth!.user;
  const onboarding = await getMyOnboarding(currentUser);
  response.status(200).json({ data: { onboarding } });
}

export async function saveMyOnboardingController(request: Request, response: Response) {
  const body = request.body as SaveOnboardingBody;
  const currentUser = request.auth!.user;
  const onboarding = await saveMyOnboarding(body, currentUser);
  response.status(200).json({ data: { onboarding } });
}

export async function completeMyOnboardingController(request: Request, response: Response) {
  const body = request.body as CompleteOnboardingBody;
  const currentUser = request.auth!.user;
  const result = await completeMyOnboarding(body, currentUser);
  response.status(200).json({ data: result });
}
