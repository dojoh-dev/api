import "fastify";

declare module "fastify" {
	interface FastifyRequest {
		t: (key: string, options?: unknown) => string;
	}
}
