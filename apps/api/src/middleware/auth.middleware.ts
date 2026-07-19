import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const supabase = createClient(env.SUPABASE_URL || 'https://placeholder.supabase.co', env.SUPABASE_ANON_KEY || 'placeholder');

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
  };
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    // In dev mode without Supabase keys, fallback to mock user for easy testing
    if (env.NODE_ENV === 'development' && (!env.SUPABASE_URL || env.SUPABASE_URL.includes('placeholder'))) {
      req.user = { id: '00000000-0000-0000-0000-000000000001', email: 'dev@gamescribe.local' };
      return next();
    }
    return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Missing Authorization header' } });
  }

  const token = authHeader.split(' ')[1];

  try {
    const { data, error } = await (supabase.auth as any).getUser(token);
    const user = data?.user;
    if (error || !user) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token' } });
    }

    req.user = {
      id: user.id,
      email: user.email,
    };
    next();
  } catch (err) {
    logger.error({ err }, 'Auth middleware error');
    return res.status(500).json({ success: false, error: { code: 'AUTH_ERROR', message: 'Authentication verification failed' } });
  }
}
