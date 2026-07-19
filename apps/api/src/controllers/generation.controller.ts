import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { GenerationQueueService } from '../services/generation.service';
import { LLMService } from '../services/llm.service';
import { pool } from '../config/db';
import { GenerateScriptRequest, ReviseAssetRequest } from '@gamescribe/shared-types';

export class GenerationController {
  /**
   * POST /projects/:id/generate
   * Kick off multi-file generation background job and return jobId immediately
   */
  static async startGeneration(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const params: GenerateScriptRequest = req.body;

    // Verify project ownership
    const userId = req.user?.id || '00000000-0000-0000-0000-000000000001';
    const projectRes = await pool.query('SELECT id FROM projects WHERE id = $1 AND user_id = $2', [id, userId]);

    if (projectRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
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

    const assetRes = await pool.query(
      'SELECT content, version FROM project_assets WHERE project_id = $1 AND asset_name = $2 ORDER BY version DESC LIMIT 1',
      [id, assetName]
    );

    if (assetRes.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Asset not found' } });
    }

    const existing = assetRes.rows[0];
    const revisedContent = await LLMService.reviseAsset(assetName, existing.content, instructions);
    const newVersion = existing.version + 1;

    await pool.query(
      `INSERT INTO project_assets (project_id, asset_name, content, version)
       VALUES ($1, $2, $3, $4)`,
      [id, assetName, revisedContent, newVersion]
    );

    return res.json({
      success: true,
      data: {
        assetName,
        version: newVersion,
        content: revisedContent,
      },
    });
  }

  /**
   * GET /projects/:id/assets
   */
  static async listAssets(req: AuthenticatedRequest, res: Response) {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT id, asset_name as "assetName", content, version, created_at as "createdAt"
       FROM project_assets WHERE project_id = $1 ORDER BY asset_name ASC`,
      [id]
    );
    return res.json({ success: true, data: result.rows });
  }

  /**
   * GET /projects/:id/assets/:assetName
   */
  static async getAsset(req: AuthenticatedRequest, res: Response) {
    const { id, assetName } = req.params;
    const result = await pool.query(
      `SELECT id, asset_name as "assetName", content, version, created_at as "createdAt"
       FROM project_assets WHERE project_id = $1 AND asset_name = $2 ORDER BY version DESC LIMIT 1`,
      [id, assetName]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Asset not found' } });
    }

    return res.json({ success: true, data: result.rows[0] });
  }
}
