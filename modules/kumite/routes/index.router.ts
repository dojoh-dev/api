import type { FastifyInstance } from "fastify";

export default async function kumiteRouter(fastify: FastifyInstance) {
	fastify.get("/", async () => {
		return { kumites: [{ id: 1, name: "First Kumite" }] };
	});
}
