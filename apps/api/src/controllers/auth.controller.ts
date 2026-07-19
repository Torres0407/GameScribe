import { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { pool } from '../config/db';
import { env } from '../config/env';
import { logger } from '../utils/logger';

const supabase = createClient(env.SUPABASE_URL || 'https://placeholder.supabase.co', env.SUPABASE_ANON_KEY || 'placeholder');

export class AuthController {
  static async signup(req: Request, res: Response) {
    const { email, password, displayName } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Email and password required' } });
    }

    try {
      const { data, error } = await supabase.auth.signUp({ email, password });
      if (error) {
        return res.status(400).json({ success: false, error: { code: 'SIGNUP_ERROR', message: error.message } });
      }

      if (data.user) {
        await pool.query('INSERT INTO profiles (id, display_name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING', [
          data.user.id,
          displayName || email.split('@')[0],
        ]);
      }

      return res.status(201).json({
        success: true,
        data: {
          user: data.user,
          session: data.session,
        },
      });
    } catch (err) {
      logger.error({ err }, 'Signup failed');
      return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Signup processing failed' } });
    }
  }

  static async login(req: Request, res: Response) {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Email and password required' } });
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // Dev fallback if unconfigured
        if (env.NODE_ENV === 'development' && email === 'dev@gamescribe.local') {
          return res.json({
            success: true,
            data: {
              token: 'dev-jwt-token-placeholder',
              user: { id: '00000000-0000-0000-0000-000000000001', email: 'dev@gamescribe.local' },
            },
          });
        }
        return res.status(401).json({ success: false, error: { code: 'LOGIN_FAILED', message: error.message } });
      }

      return res.json({
        success: true,
        data: {
          token: data.session?.access_token,
          user: data.user,
        },
      });
    } catch (err) {
      logger.error({ err }, 'Login failed');
      return res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: 'Login failed' } });
    }
  }

  static async logout(_req: AuthenticatedRequest, res: Response) {
    try {
      await supabase.auth.signOut();
      return res.json({ success: true, message: 'Successfully logged out' });
    } catch (err) {
      return res.json({ success: true, message: 'Logged out' });
    }
  }

  static async getMe(req: AuthenticatedRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } });
    }

    try {
      const result = await pool.query('SELECT id, display_name, created_at FROM profiles WHERE id = $1', [req.user.id]);
      const profile = result.rows[0] || { id: req.user.id, displayName: req.user.email?.split('@')[0] || 'User', createdAt: new Date().toISOString() };

      return res.json({
        success: true,
        data: {
          id: profile.id,
          displayName: profile.display_name || profile.displayName,
          email: req.user.email,
          createdAt: profile.created_at || profile.createdAt,
        },
      });
    } catch (err) {
      return res.json({
        success: true,
        data: {
          id: req.user.id,
          displayName: req.user.email?.split('@')[0] || 'Developer',
          email: req.user.email,
          createdAt: new Date().toISOString(),
        },
      });
    }
  }
}
