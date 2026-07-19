import { Router } from 'express';
import { authRouter } from './auth.routes';
import { corpusRouter } from './corpus.routes';
import { projectRouter } from './project.routes';

export const apiRouter = Router();

apiRouter.use('/auth', authRouter);
apiRouter.use('/corpus', corpusRouter);
apiRouter.use('/projects', projectRouter);
