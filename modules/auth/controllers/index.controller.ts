import crypto from "node:crypto";

import type { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { ZodError } from "zod";

import jwtConfig from "@/config/jwt";
import redisClient from "@/database/redis/client";

import NotFoundError from "../exceptions/notfound.exception";
import UnauthorizedError from "../exceptions/unauthorized.exception";
import CredentialSchema from "../schemas/credential.schema";
import RefreshTokenSchema from "../schemas/refresh-token.schema";
import type { JwtSubject } from "../types/jwt";

export default {
	login(req: FastifyRequest, reply: FastifyReply) {
		try {
			const { password, ...credentials } = CredentialSchema.parse(req.body);

			// @todo: validate credentials with database

			const user = {
				id: crypto.randomUUID(),
				email: credentials.email,
				username: "@john_doe",
				name: "John Doe",
				avatarUrl: "https://example.com/avatar.jpg",
				roles: ["player"],
			};

			const token = jwt.sign(
				{
					exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour expiration
					iat: Math.floor(Date.now() / 1000),
					sub: user,
				},
				jwtConfig.secret,
				{ algorithm: jwtConfig.algorithm },
			);

			const refreshToken = jwt.sign(
				{
					exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour expiration
					iat: Math.floor(Date.now() / 1000),
					sub: user,
					type: "refresh",
					tokenId: crypto.randomUUID(),
				},
				jwtConfig.secret,
				{ algorithm: jwtConfig.algorithm },
			);

			const response = {
				user,
				tokens: {
					token,
					refreshToken,
					expiresIn: 60 * 60, // 1 hour in seconds
				},
			};

			redisClient.set(
				`session:${user.id}`,
				JSON.stringify({
					...user,
					ipv4: req.ip,
					userAgent: req.headers["user-agent"],
					version: 1,
				}),
				"EX",
				1 * 24 * 60 * 60, // session long 1 day max
			);

			reply.send({ message: req.t("Login successful"), data: response });
		} catch (e) {
			console.debug((e as Error).message);

			if (e instanceof ZodError) {
				reply.status(400).send({
					error: req.t("Invalid credentials"),
					details: e.issues,
				});
			} else {
				reply.status(500).send({ error: req.t("Server error") });
			}
		}
	},

	logout(req: FastifyRequest, reply: FastifyReply) {
		try {
			const bearerToken = req.headers.authorization;
			if (!bearerToken) {
				throw new UnauthorizedError(req.t("Unauthorized"));
			}

			const token = bearerToken.split(" ")[1];
			if (!token) {
				throw new UnauthorizedError(req.t("Unauthorized"));
			}

			const decoded = jwt.verify(token, jwtConfig.secret, {
				algorithms: [jwtConfig.algorithm],
			}) as jwt.JwtPayload;
			const sub = decoded.sub as unknown as { id: string };

			redisClient.del(`session:${sub.id}`);

			reply.status(204).send();
		} catch (e) {
			console.debug((e as Error).message);

			if (
				e instanceof jwt.JsonWebTokenError ||
				e instanceof UnauthorizedError
			) {
				reply
					.status(401)
					.send({ error: req.t("Unauthorized"), details: e.message });
			} else {
				reply.status(500).send({ error: req.t("Server error") });
			}
		}
	},

	refresh(req: FastifyRequest, reply: FastifyReply) {
		try {
			// @todo check if session exist in database
			// and validate tokenId with the one in database to prevent reuse of refresh token

			const { refreshToken } = RefreshTokenSchema.parse(req.body);

			const decoded = jwt.verify(refreshToken, jwtConfig.secret, {
				algorithms: [jwtConfig.algorithm],
			}) as jwt.JwtPayload;

			if (decoded.type !== "refresh") {
				throw new UnauthorizedError(req.t("Invalid token type"));
			}

			const user = {
				id: crypto.randomUUID(),
				email: (decoded.sub as unknown as { email: string }).email,
				username: "@john_doe",
				name: "John Doe",
				avatarUrl: "https://example.com/avatar.jpg",
				roles: ["player"],
			};

			const newToken = jwt.sign(
				{
					exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour expiration
					iat: Math.floor(Date.now() / 1000),
					sub: user,
				},
				jwtConfig.secret,
				{ algorithm: jwtConfig.algorithm },
			);

			const newRefreshToken = jwt.sign(
				{
					exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour expiration
					iat: Math.floor(Date.now() / 1000),
					sub: user,
					type: "refresh",
					tokenId: crypto.randomUUID(),
				},
				jwtConfig.secret,
				{ algorithm: jwtConfig.algorithm },
			);

			const response = {
				tokens: {
					token: newToken,
					refreshToken: newRefreshToken,
					expiresIn: 60 * 60, // 1 hour in seconds
				},
			};

			reply.send({
				message: req.t("Token refreshed successfully"),
				data: response,
			});
		} catch (e) {
			console.debug((e as Error).message);

			if (e instanceof ZodError) {
				reply.status(400).send({
					error: req.t("Invalid request"),
					details: e.issues,
				});
			} else if (e instanceof jwt.JsonWebTokenError) {
				reply.status(401).send({
					error: req.t("Invalid refresh token"),
					details: e.message,
				});
			} else {
				reply.status(500).send({ error: req.t("Server error") });
			}
		}
	},

	async revoke(req: FastifyRequest, reply: FastifyReply) {
		try {
			const bearerToken = req.headers.authorization;
			if (!bearerToken) {
				throw new UnauthorizedError(req.t("Unauthorized"));
			}

			const token = bearerToken.split(" ")[1];
			if (!token) {
				throw new UnauthorizedError(req.t("Unauthorized"));
			}

			const decoded = jwt.verify(token, jwtConfig.secret, {
				algorithms: [jwtConfig.algorithm],
			}) as jwt.JwtPayload;
			const { id: userId } = decoded.sub as unknown as JwtSubject;

			if (!redisClient.exists(`session:${userId}`)) {
				throw new NotFoundError(req.t("Session not found"));
			}
			const rawUserSession = await redisClient.get(`session:${userId}`);
			const userSession = JSON.parse(rawUserSession as string);

			redisClient.set(
				`session:${userId}`,
				JSON.stringify({
					...userSession,
					version: userSession.version + 1,
				}),
				"KEEPTTL",
			);

			reply.send({ message: req.t("Session revoked") });
		} catch (e) {
			console.debug((e as Error).message);

			if (e instanceof ZodError) {
				reply.status(400).send({
					error: req.t("Invalid request"),
					details: e.issues,
				});
			} else if (e instanceof NotFoundError) {
				reply.status(404).send({ error: e.message });
			} else if (
				e instanceof jwt.JsonWebTokenError ||
				e instanceof UnauthorizedError
			) {
				reply
					.status(401)
					.send({ error: req.t("Unauthorized"), details: e.message });
			} else {
				reply.status(500).send({ error: req.t("Server error") });
			}
		}
	},
} as const;
