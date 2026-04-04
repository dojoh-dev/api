import type { FastifyInstance } from "fastify";

export default async function authRouter(f: FastifyInstance) {
	f.get("/users", async () => {
		return {
			users: [
				{ id: 1, name: "John" },
				{ id: 2, name: "Jane" },
			],
		};
	});

	f.get("/users/:id", async (request) => {
		const { id } = request.params as { id: string };
		return { user: { id, name: "John" } };
	});

	f.post("/users", async (request) => {
		return { created: true, data: request.body };
	});
}
