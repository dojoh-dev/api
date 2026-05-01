import crypto from "node:crypto";

import bcrypt from "bcrypt";
import type { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { ZodError } from "zod";

import jwtConfig from "@/config/jwt";
import prisma from "@/database/prisma/client";
import redisClient from "@/database/redis/client";

import {
	ConflictError,
	NotFoundError,
	UnauthorizedError,
} from "../exceptions/index.exception";
import {
	CredentialSchema,
	createSignUpSchema,
	RefreshTokenSchema,
} from "../schemas/index.schema";
import { createTokens } from "../serivces/jwt.service";
import type { JwtSubject } from "../types/jwt";

export default {
	async signUp(req: FastifyRequest, reply: FastifyReply) {
		try {
			const Schema = createSignUpSchema(req.t);

			const { password, ...credentials } = Schema.parse(req.body);

			const user = await prisma.user.findUnique({
				where: {
					email: credentials.email,
				},
			});

			if (user) {
				throw new ConflictError(
					req.t("Email already in use", { ns: "errors" }),
				);
			}

			const newUser = await prisma.user.create({
				data: {
					email: credentials.email,
					nickname: credentials.nickname,
					password: await bcrypt.hash(password, 10),
				},
				select: {
					id: true,
					email: true,
					nickname: true,
				},
			});

			const tokens = createTokens({
				id: newUser.id,
				email: newUser.email,
				nickname: newUser.nickname,
			});

			return reply.status(201).send({
				message: req.t("User created successfully"),
				data: newUser,
				tokens,
			});
		} catch (e) {
			if (e instanceof ZodError) {
				return reply.status(400).send({
					error: req.t("Invalid credentials", { ns: "errors" }),
					details: e.issues,
				});
			}

			if (e instanceof ConflictError) {
				return reply.status(e.statusCode).send({ error: e.message });
			}

			console.debug((e as Error).message);
			return reply
				.status(500)
				.send({ error: req.t("Server error", { ns: "errors" }) });
		}
	},

	async logInViaSSO(req: FastifyRequest, reply: FastifyReply) {
		try {
			const credentials = CredentialSchema.parse(req.body);

			const { password, ...user } = await prisma.user.findFirst({
				where: {
					email: credentials.email,
				},
				select: {
					id: true,
					email: true,
					nickname: true,
					password: true,
					avatar: true,
				},
			});

			if (!user) {
				throw new NotFoundError(req.t("User not found"));
			}

			const authenticated = await bcrypt.compare(
				credentials.password,
				password,
			);

			if (!authenticated) {
				throw new UnauthorizedError(req.t("Invalid credentials"));
			}

			const tokens = createTokens({
				id: user.id,
				email: user.email,
				nickname: user.nickname,
			});

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

			reply.send({
				message: req.t("Login successful"),
				data: user,
				tokens,
			});
		} catch (e) {
			if (e instanceof ZodError) {
				return reply.status(400).send({
					error: req.t("Invalid credentials"),
					details: e.issues,
				});
			}

			if (e instanceof UnauthorizedError) {
				return reply.status(e.statusCode).send({
					error: e.message,
					details: {
						email: req.t("Check your email", { ns: "errors" }),
						password: req.t("Check your password", {
							ns: "errors",
						}),
					},
				});
			}

			console.debug((e as Error).message);
			return reply.status(500).send({ error: req.t("Server error") });
		}
	},

	logOut(req: FastifyRequest, reply: FastifyReply) {
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

			const tokens = createTokens(decoded.sub);

			reply.send({
				message: req.t("Token refreshed successfully"),
				tokens,
				data: decoded.sub,
			});
		} catch (e) {
			if (e instanceof ZodError) {
				return reply.status(400).send({
					error: req.t("Invalid request"),
					details: e.issues,
				});
			}

			if (e instanceof jwt.JsonWebTokenError) {
				return reply.status(401).send({
					error: req.t("Invalid refresh token"),
					details: e.message,
				});
			}

			console.debug((e as Error).message);
			return reply.status(500).send({ error: req.t("Server error") });
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
			if (e instanceof ZodError) {
				return reply.status(400).send({
					error: req.t("Invalid request"),
					details: e.issues,
				});
			}

			if (e instanceof NotFoundError) {
				return reply.status(404).send({ error: e.message });
			}

			if (
				e instanceof jwt.JsonWebTokenError ||
				e instanceof UnauthorizedError
			) {
				return reply
					.status(401)
					.send({ error: req.t("Unauthorized"), details: e.message });
			}

			console.debug((e as Error).message);
			return reply.status(500).send({ error: req.t("Server error") });
		}
	},
} as const;
