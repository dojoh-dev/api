import fp from "fastify-plugin";
import i18next from "i18next";
import Backend from "i18next-fs-backend";
import * as middleware from "i18next-http-middleware";

import i18nConfig from "@/config/i18n";

await i18next
	.use(Backend)
	.use(middleware.LanguageDetector)
	.init({
		...i18nConfig,
		detection: {
			order: ["header", "querystring"],
			lookupHeader: "accept-language",
			lookupQuerystring: "lang",
			caches: false,
		},
	});

export default fp(async (f) => {
	// attach i18next middleware to raw req/res
	f.addHook("onRequest", (req, reply, done) => {
		middleware.handle(i18next)(req.raw, reply.raw, done);
	});

	// expose t() in Fastify request
	// @ts-expect-error
	f.decorateRequest("t", null);
	// @ts-expect-error
	f.decorateRequest("language", null);

	f.addHook("preHandler", async (req) => {
		// @ts-expect-error
		req.t = req.raw.t;
		// @ts-expect-error
		req.language = req.raw.language;
	});
});
