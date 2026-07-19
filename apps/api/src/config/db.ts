import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';
import { env } from './env';
import { logger } from '../utils/logger';

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
});

export async function initDatabase() {
  try {
    const client = await pool.connect();
    try {
      const sqlPath = path.join(__dirname, '../db/init.sql');
      if (fs.existsSync(sqlPath)) {
        const sql = fs.readFileSync(sqlPath, 'utf8');
        await client.query(sql);
        logger.info('Database schema and pgvector extension initialized successfully.');
      }
    } finally {
      client.release();
    }
  } catch (error) {
    logger.error({ error }, 'Failed to initialize database schema');
  }
}
