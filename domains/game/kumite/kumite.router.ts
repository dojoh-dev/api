import type { FastifyInstance } from 'fastify';

export default async function kumiteRoutes(fastify: FastifyInstance) {
    fastify.get('/kumite', async () => {
        return { kumites: [{ id: 1, name: 'First Kumite' }] };
    });
}
