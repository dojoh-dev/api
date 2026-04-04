import Fastify from "fastify";

const f = Fastify({
	logger: true,
});

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
	const { default: version_1_0 } = await import("./routes/v1.0");
	f.register(version_1_0, { prefix: "/1.0" });
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
