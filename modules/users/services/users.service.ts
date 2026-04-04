import { prisma } from "../../lib/prisma";

export class UsersService {
	async getAllUsers() {
		return await prisma.user.findMany({
			include: {
				posts: true,
			},
		});
	}

	async getUserById(id: number) {
		return await prisma.user.findUnique({
			where: { id },
			include: {
				posts: true,
			},
		});
	}

	async createUser(data: { email: string; name?: string }) {
		return await prisma.user.create({
			data,
		});
	}

	async updateUser(id: number, data: { email?: string; name?: string }) {
		return await prisma.user.update({
			where: { id },
			data,
		});
	}

	async deleteUser(id: number) {
		return await prisma.user.delete({
			where: { id },
		});
	}
}

export const usersService = new UsersService();
