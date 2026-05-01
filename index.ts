import Fastify from "fastify";

import env from "./config/env";
import i18nPlugin from "./plugins/i18n";
import jwtPlugin from "./plugins/jwt";

const f = Fastify({
	logger: true,
});

f.register(i18nPlugin);
f.register(jwtPlugin);

f.get("/", async () => {
	return { message: "Hello World!" };
});

f.get("/health", async () => {
	return { status: "ok", timestamp: new Date().toISOString() };
});

f.post("/echo", async (request) => {
	console.debug("[BODY]: ", request.body);
	console.debug("[QUERY]: ", request.query);
	console.debug("[PARAMS]: ", request.params);
	console.debug("[HEADERS]: ", request.headers);
	// console.debug("[RAW]: ", request.raw);
	// console.debug("[SERVER]: ", request.server);
	console.debug("[ID]: ", request.id);
	console.debug("[IP]: ", request.ip);
	console.debug("[IPS]: ", request.ips);
	console.debug("[HOST]: ", request.host);
	console.debug("[HOSTNAME]: ", request.hostname);
	console.debug("[PORT]: ", request.port);
	console.debug("[PROTOCOL]: ", request.protocol);
	console.debug("[URL]: ", request.url);
	console.debug("[ROUTE_METHOD]: ", request.routeOptions.method);
	console.debug(
		"[ROUTE_BODY_LIMIT]: ",
		request.routeOptions.bodyLimit
			? `${(request.routeOptions.bodyLimit / (1024 * 1024)).toFixed(2)} MB`
			: "N/A",
	);
	console.debug("[ROUTE_URL]: ", request.routeOptions.url);
	console.debug(
		"[ROUTE_ATTACH_VALIDATION]: ",
		request.routeOptions.attachValidation,
	);
	console.debug("[ROUTE_LOG_LEVEL]: ", request.routeOptions.logLevel);
	console.debug("[ROUTE_VERSION]: ", request.routeOptions.version);
	console.debug("[ROUTE_EXPOSE_HEAD]: ", request.routeOptions.exposeHeadRoute);
	console.debug(
		"[ROUTE_PREFIX_TRAILING_SLASH]: ",
		request.routeOptions.prefixTrailingSlash,
	);

	return { received: request.body };
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
