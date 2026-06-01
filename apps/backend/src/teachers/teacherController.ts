import type { Request, Response } from 'express';

import { getOnboardingState, saveOnboarding, completeTeacherOnboarding } from './teacherService.js';

export async function getOnboardingController(request: Request, response: Response) {
  const userId = request.auth!.user.id;
  const state = await getOnboardingState(userId);

  response.status(200).json({ data: { onboarding: state } });
}

export async function saveOnboardingController(request: Request, response: Response) {
  const userId = request.auth!.user.id;
  const state = await saveOnboarding(userId, request.body);

  response.status(200).json({ data: { onboarding: state } });
}

export async function completeOnboardingController(request: Request, response: Response) {
  const userId = request.auth!.user.id;
  const result = await completeTeacherOnboarding(userId, request.body);

  response.status(200).json({ data: result });
}
