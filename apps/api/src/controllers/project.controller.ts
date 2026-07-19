import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { pool } from '../config/db';
import { logger } from '../utils/logger';

export class ProjectController {
  static async createProject(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
      const { name, idea, genre, metadata = {} } = req.body;

      // Ensure profile exists in profiles table first for foreign key integrity
      await pool.query(
        `INSERT INTO profiles (id, display_name) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING`,
        [userId, req.user?.email || 'Developer']
      );

      const result = await pool.query(
        `INSERT INTO projects (user_id, name, idea, genre, metadata)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, user_id as "userId", name, idea, genre, metadata, created_at as "createdAt", updated_at as "updatedAt"`,
        [userId, name, idea, genre || null, JSON.stringify(metadata)]
      );

      return res.status(201).json({ success: true, data: result.rows[0] });
    } catch (err) {
      logger.error({ err }, 'Failed to create project');
      return res.status(500).json({ success: false, error: { code: 'PROJECT_CREATE_ERROR', message: 'Failed to create project' } });
    }
  }

  static async listProjects(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
      const result = await pool.query(
        `SELECT id, user_id as "userId", name, idea, genre, metadata, created_at as "createdAt", updated_at as "updatedAt"
         FROM projects
         WHERE user_id = $1
         ORDER BY updated_at DESC`,
        [userId]
      );

      return res.json({ success: true, data: result.rows });
    } catch (err) {
      return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Database error' } });
    }
  }

  static async getProject(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';

      const projectRes = await pool.query(
        `SELECT id, user_id as "userId", name, idea, genre, metadata, created_at as "createdAt", updated_at as "updatedAt"
         FROM projects WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );

      if (projectRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
      }

      const assetsRes = await pool.query(
        `SELECT id, project_id as "projectId", asset_name as "assetName", content, version, created_at as "createdAt"
         FROM project_assets WHERE project_id = $1 ORDER BY asset_name ASC`,
        [id]
      );

      return res.json({
        success: true,
        data: {
          ...projectRes.rows[0],
          assets: assetsRes.rows,
        },
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Database error' } });
    }
  }

  static async updateProject(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
      const { name, idea, genre, metadata } = req.body;

      const currentRes = await pool.query('SELECT name, idea, genre, metadata FROM projects WHERE id = $1 AND user_id = $2', [id, userId]);
      if (currentRes.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
      }

      const current = currentRes.rows[0];
      const updatedName = name !== undefined ? name : current.name;
      const updatedIdea = idea !== undefined ? idea : current.idea;
      const updatedGenre = genre !== undefined ? genre : current.genre;
      const updatedMetadata = metadata !== undefined ? JSON.stringify(metadata) : current.metadata;

      const result = await pool.query(
        `UPDATE projects
         SET name = $1, idea = $2, genre = $3, metadata = $4, updated_at = now()
         WHERE id = $5 AND user_id = $6
         RETURNING id, user_id as "userId", name, idea, genre, metadata, created_at as "createdAt", updated_at as "updatedAt"`,
        [updatedName, updatedIdea, updatedGenre, updatedMetadata, id, userId]
      );

      return res.json({ success: true, data: result.rows[0] });
    } catch (err) {
      logger.error({ err }, 'Failed to update project');
      return res.status(500).json({ success: false, error: { code: 'PROJECT_UPDATE_ERROR', message: 'Failed to update project' } });
    }
  }

  static async deleteProject(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = req.params;
      const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
      await pool.query('DELETE FROM projects WHERE id = $1 AND user_id = $2', [id, userId]);
      return res.json({ success: true, message: 'Project deleted' });
    } catch (err) {
      return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Database error' } });
    }
  }
}
