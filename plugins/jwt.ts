import fp from "fastify-plugin";
import jwt from "jsonwebtoken";

import jwtConfig from "@/config/jwt";
import redisClient from "@/database/redis/client";

export default fp(async (f) => {
	f.decorateRequest("user", null);

	f.addHook("preHandler", async (req, reply) => {
		const { pathname } = new URL(req.url, `http://${req.headers.host}`);

		// Skip authentication for public routes
		if (publicRoutes.some((route) => pathname.startsWith(route))) {
			return;
		}

		const authHeader = req.headers.authorization;

		if (!authHeader) {
			throw new jwt.JsonWebTokenError(req.t("Header missing"));
		}

		const token = authHeader.split(" ")[1];

		if (!token) {
			throw new jwt.JsonWebTokenError(req.t("No token provided"));
		}

		try {
			const decoded = jwt.verify(token, jwtConfig.secret, {
				algorithms: [jwtConfig.algorithm],
			}) as jwt.JwtPayload;

			const sub = decoded.sub as unknown as {
				id: number;
				email: string;
				nickname: string;
			};

			const session = await redisClient.get(`session:${sub.id}`);

			if (!session) {
				throw new jwt.JsonWebTokenError(req.t("Session expired or invalid"));
			}

			// @ts-expect-error
			req.user = JSON.parse(session);
		} catch (e) {
			if (e instanceof jwt.JsonWebTokenError) {
				return reply
					.status(401)
					.send({ error: req.t("Unauthorized"), details: e.message });
			}

			console.debug((e as Error).message);
			return reply.status(500).send({ error: req.t("Server error") });
		}
	});
});

const publicRoutes = ["/1/auth/signup", "/1/auth/login"];
