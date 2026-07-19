import { Request, Response } from 'express';
import { pool } from '../config/db';
import { EmbeddingService } from '../services/embedding.service';
import { IngestScriptRequest } from '@gamescribe/shared-types';
import { logger } from '../utils/logger';

export class CorpusController {
  static async uploadScript(req: Request<{}, {}, IngestScriptRequest>, res: Response) {
    try {
      const { title, genre, subgenre, rawText, tags = [] } = req.body;

      // Simple structured breakdown estimation
      const structuredPreview = {
        chapters: (rawText.match(/chapter/gi) || []).length || 3,
        characters: Array.from(new Set(rawText.match(/([A-Z]{3,15}):/g) || [])).map(s => s.replace(':', '')).slice(0, 5),
        endings: (rawText.match(/ending/gi) || []).length || 1,
      };

      // Generate vector embedding for the full raw script
      const embedding = await EmbeddingService.generateEmbedding(rawText);
      const formattedVector = `[${embedding.join(',')}]`;

      const result = await pool.query(
        `INSERT INTO reference_scripts (title, genre, subgenre, tags, raw_text, structured, embedding)
         VALUES ($1, $2, $3, $4, $5, $6, $7::vector)
         RETURNING id, title, genre, subgenre, tags, structured, created_at`,
        [title, genre, subgenre || null, tags, rawText, JSON.stringify(structuredPreview), formattedVector]
      );

      const script = result.rows[0];

      return res.status(201).json({
        success: true,
        data: {
          id: script.id,
          status: 'parsed',
          structuredPreview: script.structured,
        },
      });
    } catch (err) {
      logger.error({ err }, 'Failed to upload and ingest reference script');
      return res.status(500).json({ success: false, error: { code: 'INGEST_ERROR', message: 'Failed to ingest script' } });
    }
  }

  static async listScripts(req: Request, res: Response) {
    try {
      const { genre } = req.query;
      let sql = 'SELECT id, title, genre, subgenre, tags, structured, created_at FROM reference_scripts';
      const params: unknown[] = [];

      if (genre) {
        sql += ' WHERE genre = $1';
        params.push(genre);
      }

      sql += ' ORDER BY created_at DESC';

      const result = await pool.query(sql, params);
      return res.json({ success: true, data: result.rows });
    } catch (err) {
      logger.error({ err }, 'Failed to list reference scripts');
      return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Database error' } });
    }
  }

  static async getScriptById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await pool.query('SELECT id, title, genre, subgenre, tags, raw_text, structured, created_at FROM reference_scripts WHERE id = $1', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Script not found' } });
      }

      return res.json({ success: true, data: result.rows[0] });
    } catch (err) {
      return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Database error' } });
    }
  }

  static async deleteScript(req: Request, res: Response) {
    try {
      const { id } = req.params;
      await pool.query('DELETE FROM reference_scripts WHERE id = $1', [id]);
      return res.json({ success: true, message: 'Reference script deleted' });
    } catch (err) {
      return res.status(500).json({ success: false, error: { code: 'DB_ERROR', message: 'Database error' } });
    }
  }

  static async reindexCorpus(_req: Request, res: Response) {
    try {
      const scriptsRes = await pool.query('SELECT id, raw_text FROM reference_scripts');
      let updatedCount = 0;

      for (const row of scriptsRes.rows) {
        const embedding = await EmbeddingService.generateEmbedding(row.raw_text);
        const formattedVector = `[${embedding.join(',')}]`;
        await pool.query('UPDATE reference_scripts SET embedding = $1::vector WHERE id = $2', [formattedVector, row.id]);
        updatedCount++;
      }

      return res.json({
        success: true,
        data: {
          reindexedCount: updatedCount,
          message: `Reindexed vector embeddings for ${updatedCount} reference scripts`,
        },
      });
    } catch (err) {
      logger.error({ err }, 'Failed to reindex reference scripts corpus');
      return res.status(500).json({ success: false, error: { code: 'REINDEX_ERROR', message: 'Failed to reindex corpus' } });
    }
  }
}
