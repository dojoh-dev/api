import Fastify from "fastify";

import i18nPlugin from "./plugins/i18n";

const f = Fastify({
	logger: true,
});

f.register(i18nPlugin);

f.get("/", async () => {
	return { message: "Hello World!" };
});

f.get("/health", async () => {
	return { status: "ok", timestamp: new Date().toISOString() };
});

f.post("/echo", async (request) => {
	return { received: request.body };
});

// Register route modules
f.register(async (f) => {
	const { default: version_1 } = await import("./routes/v1");
	f.register(version_1, { prefix: "/1" });
});

const start = async () => {
	try {
		await f.listen({ port: 8080, host: "0.0.0.0" });
	} catch (err) {
		f.log.error(err);
		process.exit(1);
	}
};

start();
