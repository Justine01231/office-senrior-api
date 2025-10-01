import 'dotenv/config';
import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';
import { seniorsRoutes } from './routes/seniors';
import { healthRoutes } from './routes/health';
import { programsRoutes } from './routes/programs';
import { enrollmentsRoutes } from './routes/enrollments';
import { benefitsRoutes } from './routes/benefits';
import { contactsRoutes } from './routes/contacts';
import { notificationsRoutes } from './routes/notifications';

const app = new Elysia()
  .use(cors())
  .use(swagger({
    documentation: {
      info: {
        title: 'Office of Seniors API',
        version: '1.0.0',
        description: 'Senior citizen management system'
      }
    }
  }))
  .get('/', () => ({
    message: 'Office of Seniors API',
    version: '1.0.0',
    status: 'running'
  }))
  .get('/health', () => ({
    status: 'ok',
    timestamp: new Date().toISOString()
  }))
  .use(seniorsRoutes)
  .use(healthRoutes)
  .use(programsRoutes)
  .use(enrollmentsRoutes)
  .use(benefitsRoutes)
  .use(contactsRoutes)
  .use(notificationsRoutes)
  .listen({
    port: process.env.PORT || 3000,
    hostname: '0.0.0.0'
  });

console.log(`🚀 Server running at http://${app.server?.hostname}:${app.server?.port}`);
console.log(`📚 Swagger docs at http://${app.server?.hostname}:${app.server?.port}/swagger`);