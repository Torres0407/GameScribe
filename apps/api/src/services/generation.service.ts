import { Queue, Worker, Job } from 'bullmq';
import Redis from 'ioredis';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { pool } from '../config/db';
import { RetrievalService } from './retrieval.service';
import { LLMService } from './llm.service';
import { MemoryService } from './memory.service';
import { devAssetsStore } from '../controllers/project.controller';
import { GenerateScriptRequest, GenerationJobStatus } from '@gamescribe/shared-types';

const connection = new Redis(env.REDIS_URL, {
  maxRetriesPerRequest: null,
  lazyConnect: true,
  enableOfflineQueue: false,
  retryStrategy: (times) => {
    if (times > 2) return null;
    return 2000;
  },
});

connection.on('error', (err) => {
  // Suppress unhandled reconnect spam when Redis is not running locally in dev
});

// In-memory fallback status tracker when Redis is offline in dev
const localJobStatuses = new Map<string, GenerationJobStatus>();

export interface GenerationJobData {
  jobId: string;
  projectId: string;
  params: GenerateScriptRequest;
}

export class GenerationQueueService {
  private static queue: Queue | null = null;
  private static isWorkerRunning = false;

  static initQueue() {
    try {
      this.queue = new Queue('script-generation', { connection });
      this.initWorker();
    } catch (err) {
      logger.warn({ err }, 'Redis queue init failed; generation will process inline.');
    }
  }

  private static initWorker() {
    if (this.isWorkerRunning) return;
    try {
      new Worker(
        'script-generation',
        async (job: Job<GenerationJobData>) => {
          await GenerationQueueService.processJob(job.data);
        },
        { connection }
      );
      this.isWorkerRunning = true;
      logger.info('BullMQ Script Generation worker started.');
    } catch (err) {
      logger.warn({ err }, 'BullMQ worker init skipped (Redis connection issue).');
    }
  }

  static async addGenerationJob(projectId: string, params: GenerateScriptRequest): Promise<string> {
    const jobId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const jobData: GenerationJobData = { jobId, projectId, params };

    const initialStatus: GenerationJobStatus = {
      jobId,
      projectId,
      status: 'pending',
      progress: 0,
      currentStep: 'Queued for generation',
    };
    localJobStatuses.set(jobId, initialStatus);

    if (this.queue) {
      try {
        await this.queue.add('generate-package', jobData, { jobId });
        return jobId;
      } catch (err) {
        logger.warn({ err }, 'Adding to BullMQ failed; processing inline');
      }
    }

    // Process inline asynchronously if Redis is offline
    setImmediate(() => {
      this.processJob(jobData).catch(err => logger.error({ err }, 'Inline generation failed'));
    });

    return jobId;
  }

  static getJobStatus(jobId: string): GenerationJobStatus | null {
    return localJobStatuses.get(jobId) || null;
  }

  private static updateStatus(jobId: string, updates: Partial<GenerationJobStatus>) {
    const current = localJobStatuses.get(jobId) || {
      jobId,
      projectId: '',
      status: 'processing',
    };
    const updated = { ...current, ...updates };
    localJobStatuses.set(jobId, updated);
  }

  static async processJob(jobData: GenerationJobData) {
    const { jobId, projectId, params } = jobData;
    logger.info({ jobId, projectId }, 'Starting multi-file script generation process');

    this.updateStatus(jobId, { status: 'processing', progress: 10, currentStep: 'Retrieving reference script exemplars via pgvector' });

    // Step 1: Retrieval via pgvector
    const references = await RetrievalService.searchSimilarScripts(params.idea, 3, params.genre);
    const referenceSnippets = references.map(r => ({
      title: r.title,
      genre: r.genre,
      snippet: r.rawText.substring(0, 1500),
    }));

    // Step 2: Fetch project memory
    const projectMemories = await MemoryService.getProjectMemories(projectId);

    // Step 3: Define files to generate
    const filesToGenerate = ['STORY.md', 'CHARACTERS.md', 'DIALOGUE.md', 'QUESTS.md', 'ENDINGS.md'];
    const generatedAssets: string[] = [];

    const totalFiles = filesToGenerate.length;

    for (let i = 0; i < totalFiles; i++) {
      const assetName = filesToGenerate[i];
      const progress = Math.round(20 + ((i + 1) / totalFiles) * 70);

      this.updateStatus(jobId, {
        progress,
        currentStep: `Generating ${assetName} (${i + 1}/${totalFiles})`,
      });

      const content = await LLMService.generateAsset(assetName, {
        idea: params.idea,
        genre: params.genre,
        tone: params.tone,
        platform: params.platform,
        targetLength: params.targetLength,
        endingsCount: params.endingsCount,
        references: referenceSnippets,
        projectMemory: projectMemories.map(m => ({ key: m.key, value: m.value })),
      });

      // Save generated asset to database with dev fallback
      try {
        const versionRes = await pool.query(
          'SELECT COALESCE(MAX(version), 0) + 1 as next_version FROM project_assets WHERE project_id = $1 AND asset_name = $2',
          [projectId, assetName]
        );
        const nextVersion = parseInt(versionRes.rows[0]?.next_version || '1', 10);

        await pool.query(
          `INSERT INTO project_assets (project_id, asset_name, content, version)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (project_id, asset_name, version)
           DO UPDATE SET content = EXCLUDED.content`,
          [projectId, assetName, content, nextVersion]
        );
      } catch (err) {
        const devAssets = devAssetsStore.get(projectId) || [];
        const existingIndex = devAssets.findIndex(a => a.assetName === assetName);
        const assetObj = {
          id: `asset_${Date.now()}_${i}`,
          projectId,
          assetName,
          content,
          version: 1,
          createdAt: new Date().toISOString(),
        };

        if (existingIndex >= 0) {
          devAssets[existingIndex] = assetObj;
        } else {
          devAssets.push(assetObj);
        }
        devAssetsStore.set(projectId, devAssets);
      }

      generatedAssets.push(assetName);

      // Extract and save key lore facts into project memory
      if (assetName === 'CHARACTERS.md') {
        await MemoryService.setProjectMemory(projectId, 'lore:characters', { generated: true, timestamp: new Date().toISOString() });
      }
    }

    this.updateStatus(jobId, {
      status: 'completed',
      progress: 100,
      currentStep: 'Generation completed successfully',
      assets: generatedAssets,
      retrievedReferences: references.map(r => r.id),
    });

    logger.info({ jobId, projectId }, 'Multi-file script generation completed');
  }
}
