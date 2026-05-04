import type { FastifyInstance } from "fastify";

export default async function version_1(f: FastifyInstance) {
	const { default: authRouter } = await import(
		"@/modules/auth/routes/index.router"
	);
	const { default: oauthRouter } = await import(
		"@/modules/auth/routes/oauth.router"
	);
	const { default: kumiteRouter } = await import(
		"@/modules/kumite/routes/index.router"
	);

	f.register(authRouter, { prefix: "/auth" });
	f.register(oauthRouter, { prefix: "/oauth" });
	f.register(kumiteRouter, { prefix: "/kumite" });
}
