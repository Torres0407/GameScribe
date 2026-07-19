import { Router } from 'express';
import { CorpusController } from '../controllers/corpus.controller';
import { validateBody } from '../middleware/validate.middleware';
import { z } from 'zod';

const ingestSchema = z.object({
  title: z.string().min(1),
  genre: z.string().min(1),
  subgenre: z.string().optional(),
  rawText: z.string().min(10),
  tags: z.array(z.string()).optional(),
});

export const corpusRouter = Router();

corpusRouter.post('/scripts', validateBody(ingestSchema), CorpusController.uploadScript);
corpusRouter.get('/scripts', CorpusController.listScripts);
corpusRouter.get('/scripts/:id', CorpusController.getScriptById);
corpusRouter.delete('/scripts/:id', CorpusController.deleteScript);
corpusRouter.post('/reindex', CorpusController.reindexCorpus);
