import Fastify from 'fastify';
import authsRoutes from './domains/auth/auth.router.ts';
import gameRoutes from './domains/game/game.router.ts';

const fastify = Fastify({
  logger: true
});

fastify.get('/', async () => {
  return { message: 'Hello World!' };
});

fastify.get('/health', async () => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

fastify.post('/echo', async (request) => {
  return { received: request.body };
});

// Register route modules
fastify.register(authsRoutes);
fastify.register(gameRoutes);

const start = async () => {
  try {
    await fastify.listen({ port: 8080, host: '0.0.0.0' });
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();