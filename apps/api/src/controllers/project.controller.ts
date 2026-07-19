import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { pool } from '../config/db';
import { logger } from '../utils/logger';

// In-memory fallback stores for local dev when Postgres is offline
export const devProjectsStore = new Map<string, any>();
export const devAssetsStore = new Map<string, any[]>();

export class ProjectController {
  static async createProject(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
    const { name, idea, genre, metadata = {} } = req.body;

    try {
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
      logger.warn({ err }, 'Database connection failed; using in-memory dev project store.');

      const newProject = {
        id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId,
        name,
        idea,
        genre: genre || 'horror',
        metadata,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      devProjectsStore.set(newProject.id, newProject);
      devAssetsStore.set(newProject.id, []);

      return res.status(201).json({ success: true, data: newProject });
    }
  }

  static async listProjects(req: AuthenticatedRequest, res: Response) {
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';

    try {
      const result = await pool.query(
        `SELECT id, user_id as "userId", name, idea, genre, metadata, created_at as "createdAt", updated_at as "updatedAt"
         FROM projects
         WHERE user_id = $1
         ORDER BY updated_at DESC`,
        [userId]
      );

      return res.json({ success: true, data: result.rows });
    } catch (err) {
      const devProjects = Array.from(devProjectsStore.values()).filter(p => p.userId === userId);
      return res.json({ success: true, data: devProjects });
    }
  }

  static async getProject(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';

    try {
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
      const devProject = devProjectsStore.get(id);
      if (!devProject) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
      }

      const devAssets = devAssetsStore.get(id) || [];
      return res.json({
        success: true,
        data: {
          ...devProject,
          assets: devAssets,
        },
      });
    }
  }

  static async updateProject(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
    const { name, idea, genre, metadata } = req.body;

    try {
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
      const devProject = devProjectsStore.get(id);
      if (!devProject) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
      }

      const updated = {
        ...devProject,
        name: name !== undefined ? name : devProject.name,
        idea: idea !== undefined ? idea : devProject.idea,
        genre: genre !== undefined ? genre : devProject.genre,
        metadata: metadata !== undefined ? metadata : devProject.metadata,
        updatedAt: new Date().toISOString(),
      };
      devProjectsStore.set(id, updated);
      return res.json({ success: true, data: updated });
    }
  }

  static async deleteProject(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';

    try {
      await pool.query('DELETE FROM projects WHERE id = $1 AND user_id = $2', [id, userId]);
      return res.json({ success: true, message: 'Project deleted' });
    } catch (err) {
      devProjectsStore.delete(id);
      devAssetsStore.delete(id);
      return res.json({ success: true, message: 'Project deleted' });
    }
  }
}
