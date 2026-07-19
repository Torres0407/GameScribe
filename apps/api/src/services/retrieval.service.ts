import { pool } from '../config/db';
import { EmbeddingService } from './embedding.service';
import { ReferenceScript } from '@gamescribe/shared-types';
import { logger } from '../utils/logger';

export class RetrievalService {
  /**
   * Search reference scripts in database using cosine similarity (pgvector vector_cosine_ops).
   */
  static async searchSimilarScripts(query: string, limit: number = 3, genreFilter?: string): Promise<ReferenceScript[]> {
    try {
      const queryEmbedding = await EmbeddingService.generateEmbedding(query);
      const formattedVector = `[${queryEmbedding.join(',')}]`;

      let sql = `
        SELECT id, title, genre, subgenre, tags, raw_text, structured, created_at,
               1 - (embedding <=> $1::vector) as similarity
        FROM reference_scripts
      `;
      const params: unknown[] = [formattedVector];

      if (genreFilter) {
        sql += ` WHERE genre = $2`;
        params.push(genreFilter);
      }

      sql += ` ORDER BY embedding <=> $1::vector ASC LIMIT $${params.length + 1}`;
      params.push(limit);

      const result = await pool.query(sql, params);
      return result.rows.map(row => ({
        id: row.id,
        title: row.title,
        genre: row.genre,
        subgenre: row.subgenre,
        tags: row.tags,
        rawText: row.raw_text,
        structured: row.structured,
        createdAt: row.created_at,
      }));
    } catch (err) {
      logger.error({ err }, 'pgvector similarity search failed');
      return [];
    }
  }
}
