import { Router } from 'express';
import { ProjectController } from '../controllers/project.controller';
import { GenerationController } from '../controllers/generation.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import { validateBody } from '../middleware/validate.middleware';
import { generationRateLimiter } from '../middleware/rateLimit.middleware';
import { z } from 'zod';

const createProjectSchema = z.object({
  name: z.string().min(1),
  idea: z.string().min(5),
  genre: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  idea: z.string().min(5).optional(),
  genre: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const generateSchema = z.object({
  idea: z.string().min(5),
  genre: z.string().optional(),
  tone: z.string().optional(),
  targetLength: z.string().optional(),
  platform: z.string().optional(),
  referenceGames: z.array(z.string()).optional(),
  endingsCount: z.number().optional(),
});

const reviseSchema = z.object({
  instructions: z.string().min(3),
});

export const projectRouter = Router();

projectRouter.use(authMiddleware);

// Project CRUD
projectRouter.post('/', validateBody(createProjectSchema), ProjectController.createProject);
projectRouter.get('/', ProjectController.listProjects);
projectRouter.get('/:id', ProjectController.getProject);
projectRouter.patch('/:id', validateBody(updateProjectSchema), ProjectController.updateProject);
projectRouter.delete('/:id', ProjectController.deleteProject);

// Generation & Asset Endpoints
projectRouter.post('/:id/generate', generationRateLimiter, validateBody(generateSchema), GenerationController.startGeneration);
projectRouter.get('/:id/status', GenerationController.getJobStatus);
projectRouter.get('/:id/assets', GenerationController.listAssets);
projectRouter.get('/:id/assets/:assetName', GenerationController.getAsset);
projectRouter.post('/:id/assets/:assetName/revise', validateBody(reviseSchema), GenerationController.reviseAsset);
