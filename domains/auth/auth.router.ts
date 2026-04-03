import type { FastifyInstance } from 'fastify';

export default async function authRoutes(fastify: FastifyInstance) {
  fastify.get('/users', async () => {
    return { users: [{ id: 1, name: 'John' }, { id: 2, name: 'Jane' }] };
  });

  fastify.get('/users/:id', async (request) => {
    const { id } = request.params as { id: string };
    return { user: { id, name: 'John' } };
  });

  fastify.post('/users', async (request) => {
    return { created: true, data: request.body };
  });
}
