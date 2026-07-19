import { pool } from '../config/db';
import { ProjectMemory } from '@gamescribe/shared-types';
import { logger } from '../utils/logger';

export class MemoryService {
  /**
   * Get all memory entries for a given project
   */
  static async getProjectMemories(projectId: string): Promise<ProjectMemory[]> {
    try {
      const result = await pool.query(
        'SELECT id, project_id, key, value, updated_at FROM project_memory WHERE project_id = $1',
        [projectId]
      );
      return result.rows.map(r => ({
        id: r.id,
        projectId: r.project_id,
        key: r.key,
        value: r.value,
        updatedAt: r.updated_at,
      }));
    } catch (err) {
      logger.error({ err, projectId }, 'Failed to fetch project memory');
      return [];
    }
  }

  /**
   * Upsert a memory key-value entry for a project
   */
  static async setProjectMemory(projectId: string, key: string, value: Record<string, unknown>): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO project_memory (project_id, key, value, updated_at)
         VALUES ($1, $2, $3, now())
         ON CONFLICT (project_id, key)
         DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [projectId, key, JSON.stringify(value)]
      );
    } catch (err) {
      logger.error({ err, projectId, key }, 'Failed to upsert project memory');
    }
  }
}
