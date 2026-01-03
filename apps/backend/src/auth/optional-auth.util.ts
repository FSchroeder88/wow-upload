import { Request } from 'express';
import { AuthService } from './auth.service';

export function getOptionalUserId(
  req: Request,
  auth: AuthService,
): number | null {
  const cookies = req.cookies as unknown;
  if (!cookies || typeof cookies !== 'object') return null;

  const token = (cookies as Record<string, unknown>)['auth_token'];
  if (typeof token !== 'string') return null;

  try {
    const payload = auth.verifyToken(token);
    return payload.userId;
  } catch {
    return null;
  }
}
