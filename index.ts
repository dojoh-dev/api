import fastifyCookie from "@fastify/cookie";
import Fastify from "fastify";

import env from "./config/env";
import i18nPlugin from "./plugins/i18n";

const f = Fastify({
	logger: true,
});

f.register(fastifyCookie, {
	secret: env("COOKIE_SECRET", undefined),
});

f.register(i18nPlugin);

f.get("/health", async () => {
	return { status: "ok", timestamp: new Date().toISOString() };
});

// Register route modules
f.register(async (f) => {
	const { default: version_1 } = await import("./routes/v1");
	f.register(version_1, { prefix: "/1" });
});

const start = async () => {
	const port = env("PORT", 8080);

	try {
		await f.listen({ port, host: "0.0.0.0" });
	} catch (err) {
		f.log.error(err);
		process.exit(1);
	}
};

start();
