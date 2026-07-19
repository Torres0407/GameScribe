import { env } from '../config/env';
import { logger } from '../utils/logger';

export class EmbeddingService {
  /**
   * Generates a 1536-dimensional vector embedding for text using Voyage AI / OpenAI or fallback mock vector for dev.
   */
  static async generateEmbedding(text: string): Promise<number[]> {
    if (env.VOYAGE_API_KEY) {
      try {
        const response = await fetch('https://api.voyageai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.VOYAGE_API_KEY}`,
          },
          body: JSON.stringify({
            input: text,
            model: 'voyage-3',
          }),
        });

        if (response.ok) {
          const data = await response.json();
          return data.data[0].embedding;
        }
      } catch (err) {
        logger.error({ err }, 'Voyage AI embedding request failed, falling back...');
      }
    }

    if (env.OPENAI_API_KEY) {
      try {
        const response = await fetch('https://api.openai.com/v1/embeddings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
          },
          body: JSON.stringify({
            input: text,
            model: 'text-embedding-3-small',
          }),
        });

        if (response.ok) {
          const data = await response.json();
          return data.data[0].embedding;
        }
      } catch (err) {
        logger.error({ err }, 'OpenAI embedding request failed, falling back to deterministic vector...');
      }
    }

    // Fallback deterministic vector generator for local testing / offline dev
    return EmbeddingService.generateMockEmbedding(text);
  }

  private static generateMockEmbedding(text: string): number[] {
    const vector: number[] = new Array(1536).fill(0);
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      hash = (hash << 5) - hash + text.charCodeAt(i);
      hash |= 0;
    }
    for (let i = 0; i < 1536; i++) {
      vector[i] = Math.sin(hash + i) * 0.1;
    }
    return vector;
  }
}
