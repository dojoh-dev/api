import type { FastifyInstance } from 'fastify';
import { usersService } from './users.service';

export default async function usersRoutes(fastify: FastifyInstance) {
  // GET all users
  fastify.get('/users', async () => {
    const users = await usersService.getAllUsers();
    return { users };
  });

  // GET user by ID
  fastify.get('/users/:id', async (request) => {
    const { id } = request.params as { id: string };
    const user = await usersService.getUserById(parseInt(id));

    if (!user) {
      return { error: 'User not found' };
    }

    return { user };
  });

  // POST create user
  fastify.post('/users', async (request) => {
    const body = request.body as { email: string; name?: string };
    const user = await usersService.createUser(body);
    return { user };
  });

  // PUT update user
  fastify.put('/users/:id', async (request) => {
    const { id } = request.params as { id: string };
    const body = request.body as { email?: string; name?: string };
    const user = await usersService.updateUser(parseInt(id), body);
    return { user };
  });

  // DELETE user
  fastify.delete('/users/:id', async (request) => {
    const { id } = request.params as { id: string };
    await usersService.deleteUser(parseInt(id));
    return { success: true };
  });
}
