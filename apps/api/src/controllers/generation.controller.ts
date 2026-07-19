import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { GenerationQueueService } from '../services/generation.service';
import { LLMService } from '../services/llm.service';
import { pool } from '../config/db';
import { devProjectsStore, devAssetsStore } from './project.controller';
import { GenerateScriptRequest, ReviseAssetRequest } from '@gamescribe/shared-types';
import { logger } from '../utils/logger';

export class GenerationController {
  /**
   * POST /projects/:id/generate
   * Kick off multi-file generation background job and return jobId immediately
   */
  static async startGeneration(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const params: GenerateScriptRequest = req.body;
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';

    try {
      const projectRes = await pool.query('SELECT id FROM projects WHERE id = $1 AND user_id = $2', [id, userId]);
      if (projectRes.rows.length === 0 && !devProjectsStore.has(id)) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
      }
    } catch (err) {
      if (!devProjectsStore.has(id)) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
      }
    }

    const jobId = await GenerationQueueService.addGenerationJob(id, params);

    return res.status(202).json({
      success: true,
      data: {
        jobId,
        projectId: id,
        status: 'pending',
        message: 'Generation started. Poll /projects/:id/status for updates.',
      },
    });
  }

  /**
   * GET /projects/:id/status?jobId=...
   */
  static async getJobStatus(req: AuthenticatedRequest, res: Response) {
    const jobId = req.query.jobId as string;
    if (!jobId) {
      return res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'Missing jobId query parameter' } });
    }

    const status = GenerationQueueService.getJobStatus(jobId);
    if (!status) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Job not found' } });
    }

    return res.json({ success: true, data: status });
  }

  /**
   * POST /projects/:id/assets/:assetName/revise
   */
  static async reviseAsset(req: AuthenticatedRequest, res: Response) {
    const { id, assetName } = req.params;
    const { instructions }: ReviseAssetRequest = req.body;

    try {
      const assetRes = await pool.query(
        'SELECT content, version FROM project_assets WHERE project_id = $1 AND asset_name = $2 ORDER BY version DESC LIMIT 1',
        [id, assetName]
      );

      let existing = assetRes.rows[0];
      if (!existing) {
        const devAssets = devAssetsStore.get(id) || [];
        existing = devAssets.find(a => a.assetName === assetName);
      }

      if (!existing) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Asset not found' } });
      }

      const revisedContent = await LLMService.reviseAsset(assetName, existing.content, instructions);
      const newVersion = (existing.version || 1) + 1;

      try {
        await pool.query(
          `INSERT INTO project_assets (project_id, asset_name, content, version)
           VALUES ($1, $2, $3, $4)`,
          [id, assetName, revisedContent, newVersion]
        );
      } catch {
        const devAssets = devAssetsStore.get(id) || [];
        const updatedAsset = { id: `asset_${Date.now()}`, projectId: id, assetName, content: revisedContent, version: newVersion, createdAt: new Date().toISOString() };
        devAssetsStore.set(id, [...devAssets.filter(a => a.assetName !== assetName), updatedAsset]);
      }

      return res.json({
        success: true,
        data: {
          assetName,
          version: newVersion,
          content: revisedContent,
        },
      });
    } catch (err) {
      logger.error({ err }, 'Failed to revise asset');
      return res.status(500).json({ success: false, error: { code: 'REVISE_ERROR', message: 'Failed to revise asset' } });
    }
  }

  /**
   * GET /projects/:id/assets
   */
  static async listAssets(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    try {
      const result = await pool.query(
        `SELECT id, project_id as "projectId", asset_name as "assetName", content, version, created_at as "createdAt"
         FROM project_assets WHERE project_id = $1 ORDER BY asset_name ASC`,
        [id]
      );
      return res.json({ success: true, data: result.rows });
    } catch (err) {
      const devAssets = devAssetsStore.get(id) || [];
      return res.json({ success: true, data: devAssets });
    }
  }

  /**
   * GET /projects/:id/assets/:assetName
   */
  static async getAsset(req: AuthenticatedRequest, res: Response) {
    const { id, assetName } = req.params;
    try {
      const result = await pool.query(
        `SELECT id, project_id as "projectId", asset_name as "assetName", content, version, created_at as "createdAt"
         FROM project_assets WHERE project_id = $1 AND asset_name = $2 ORDER BY version DESC LIMIT 1`,
        [id, assetName]
      );

      if (result.rows.length === 0) {
        const devAssets = devAssetsStore.get(id) || [];
        const devAsset = devAssets.find(a => a.assetName === assetName);
        if (!devAsset) {
          return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Asset not found' } });
        }
        return res.json({ success: true, data: devAsset });
      }

      return res.json({ success: true, data: result.rows[0] });
    } catch (err) {
      const devAssets = devAssetsStore.get(id) || [];
      const devAsset = devAssets.find(a => a.assetName === assetName);
      if (!devAsset) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Asset not found' } });
      }
      return res.json({ success: true, data: devAsset });
    }
  }
}
