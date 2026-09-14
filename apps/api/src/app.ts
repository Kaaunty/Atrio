import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { router } from './routes.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { BASE_UPLOADS_DIR } from './config/upload.js';

const app = express();

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  })
);
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(morgan('dev'));

// Arquivos estáticos (Uploads persistentes)
app.use('/uploads', express.static(BASE_UPLOADS_DIR));

// Prefixo global da API
app.use('/api/v1', router);

// Middleware global de tratamento de erros
app.use(errorHandler);

export { app };
