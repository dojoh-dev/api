import type { FastifyInstance } from 'fastify';
import kumiteRoutes from './kumite/kumite.router';

export default async function gameRoutes(fastify: FastifyInstance) {
    fastify.register(kumiteRoutes);
}
