import type { FastifyInstance } from "fastify";

export default async function version_1_0(f: FastifyInstance) {
	const { default: kumiteRouter } = await import(
		"@modules/kumite/routes/index.router"
	);

	f.register(kumiteRouter);
}
