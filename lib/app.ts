import * as  dotEnv from 'dotenv';

const env = process.env.NODE_ENV || 'development';
dotEnv.config({
  path: `.env.${env}`,
});

import express, { json } from 'express';
import { routes } from './routes';
import * as mongoose from 'mongoose';
import fs from 'fs';
import { SQSService } from './services/SQS';
import passport from './strategies/passport-strategy';

async function bootstrap() {
  if (!fs.existsSync(`.env.${env}`)) {
    const errorMessage = `Environment file (.env.${env}) not found. Please create the environment file and add necessary env variables`;
    throw Object.assign(new Error(errorMessage), { code: 'ENV_ERROR' });
  }

  const requiredEnvVariables = [
    'MONGODB_URI_POST',
    'MONGO_POST_DATABASE',
    'JWT_ACCESS_SECRET',
    'aws_sqs_access_key_id',
    'aws_sqs_secret_access_key',
    'aws_region',
    'aws_sqs_queue_name',
    'aws_sqs_queue_url',
    'aws_s3_access_key_id',
    'aws_s3_secret_access_key',
    'OPEN_AI_SECRET_KEY',
    'OPEN_AI_PRODUCT_NAME_MODEL'
  ];

  const missingVariables = requiredEnvVariables.filter(variable => {
    return !process.env[variable];
  });

  if (missingVariables.length > 0) {
    const errorMessage = `Missing required environment variables: ${missingVariables.join(', ')}`;
    throw Object.assign(new Error(errorMessage), { code: 'ENV_ERROR' });
  }

  const PORT = process.env.PORT || 3000;
  const app = express();
  app.use(json());
  app.use(passport.initialize());

  // add prefix
  const apiRouter = express.Router();
  apiRouter.use('/post', routes); // Prefixing routes with '/post'
  app.use('/api', apiRouter); // Prefixing all routes with '/api'


  try {
    await mongoose.connect(process.env.MONGODB_URI_POST || '', {
      dbName: process.env.MONGO_POST_DATABASE,
    });

    console.log('Connected to Mongodb successfully');
    app.listen(PORT, async () => {
      console.log(`Post Started and Listening on PORT ${PORT} `);
    });
    // Start SQS Polling
    SQSService.initPoling();
  } catch (err) {
    console.log('Error in starting the server', err);
  }
}

bootstrap().catch(error => {
  if (error.code && error.code.startsWith('ENV'))
    console.error(`Failed to start application: ${error}`);

  process.exit(1);
});