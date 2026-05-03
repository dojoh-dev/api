import fp from "fastify-plugin";
import jwt from "jsonwebtoken";

import jwtConfig from "@/config/jwt";
import redis from "@/database/redis/client";
import type { Session } from "@/modules/auth/models/Session";
import type { JwtSubject } from "@/modules/auth/types/jwt";

export default fp((f) => {
	f.decorateRequest("user", null);

	f.addHook("preHandler", async (req, reply) => {
		try {
			const authHeader = req.headers.authorization;

			if (!authHeader) {
				throw new jwt.JsonWebTokenError(req.t("Header missing"));
			}

			const token = authHeader.split(" ")[1];

			if (!token) {
				throw new jwt.JsonWebTokenError(req.t("No token provided"));
			}

			const decoded = jwt.verify(token, jwtConfig.secret, {
				algorithms: [jwtConfig.algorithm],
			}) as jwt.JwtPayload;

			const subject = decoded.sub as unknown as JwtSubject;

			const rawSession = await redis.get(`session:${subject.id}`);

			if (!rawSession) {
				throw new jwt.JsonWebTokenError(req.t("Session expired or invalid"));
			}

			const session = JSON.parse(rawSession) as Session;

			if (decoded.v !== session.v) {
				throw new jwt.JsonWebTokenError(req.t("Session was invalidated"));
			}

			// @ts-expect-error
			req.user = session;
		} catch (e) {
			if (e instanceof jwt.JsonWebTokenError) {
				return reply
					.status(403)
					.send({ error: req.t("Unauthorized"), details: e.message });
			}

			console.debug((e as Error).message);
			return reply.status(500).send({ error: req.t("Server error") });
		}
	});
});
