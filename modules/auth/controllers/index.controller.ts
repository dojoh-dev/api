import { OAuthProvider } from "@prisma/client";
import bcrypt from "bcrypt";
import type { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { ZodError } from "zod";

import jwtConfig from "@/config/jwt";
import prisma from "@/database/prisma/client";
import redis from "@/database/redis/client";
import {
	ConflictError,
	NotFoundError,
	UnauthorizedError,
} from "@/exceptions/index.exception";

import type { Session } from "../models/Session";
import {
	createCredentialSchema,
	createSignUpSchema,
	RefreshTokenSchema,
} from "../schemas/index.schema";
import { createTokens } from "../serivces/jwt.service";
import type { JwtSubject } from "../types/jwt";

export default {
	async signup(req: FastifyRequest, reply: FastifyReply) {
		try {
			const { password, ...credentials } = createSignUpSchema(req.t).parse(
				req.body,
			);

			const user = await prisma.user.findFirst({
				where: {
					OR: [
						{ email: credentials.email },
						{ nickname: credentials.nickname },
					],
				},
				select: {
					id: true,
				},
			});

			if (user) {
				throw new ConflictError(
					req.t("Email or Nickname already in use", {
						ns: "errors",
					}),
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

			// Not need to wait for this, if it fails we can just log it and move on
			prisma.oAuthAccount
				.create({
					data: {
						user_id: newUser.id,

						provider: OAuthProvider.NATIVE,
						provider_user_id: newUser.id.toString(),
						provider_username: newUser.nickname,
						// provider_avatar_url: null,
						provider_metadata: {
							email: newUser.email,
						},
					},
				})
				.catch((e) => {
					req.log.warn(
						"Failed to create OAuth account for user: " +
							JSON.stringify(
								{
									userId: newUser.id,
									error: (e as Error).message,
								},
								null,
								2,
							),
					);
				});

			return reply.status(201).send({
				message: req.t("User created successfully"),
				data: newUser,
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

	async login(req: FastifyRequest, reply: FastifyReply) {
		try {
			const credentials = createCredentialSchema(req.t).parse(req.body);

			const user = await prisma.user.findFirst({
				where: {
					OR: [
						{ email: credentials.identifier },
						{ nickname: credentials.identifier },
					],
				},
				select: {
					id: true,
					email: true,
					nickname: true,
					password: true,
					avatar: true,
				},
			});

			if (!user || !user.password) {
				throw new UnauthorizedError(req.t("Invalid credentials"));
			}

			if (!user.password) {
				throw new UnauthorizedError(req.t("Invalid credentials"));
			}

			const authenticated = await bcrypt.compare(
				credentials.password,
				user.password,
			);

			delete (user as { password?: string }).password;

			if (!authenticated) {
				throw new UnauthorizedError(req.t("Invalid credentials"));
			}

			const tokens = createTokens(
				{
					id: user.id,
					email: user.email,
					nickname: user.nickname,
				},
				1,
			);

			const session: Session = {
				id: user.id,
				email: user.email,
				name: user.nickname,
				nickname: user.nickname,
				// Hardware related info
				ipv4: req.ip as Session["ipv4"],
				userAgent: req.headers["user-agent"] || "unknown",
				// Token related info
				v: 1,
				refreshId: tokens.refreshId,
				provider: {
					type: OAuthProvider.NATIVE,
				},
			};

			redis.set(
				`session:${user.id}`,
				JSON.stringify(session),
				"EX",
				1 * 24 * 60 * 60, // session long 1 day max
			);

			return reply.status(200).send({
				message: req.t("Login successful"),
				tokens,
				data: user,
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

			if (e instanceof NotFoundError) {
				return reply.status(e.statusCode).send({ error: e.message });
			}

			console.debug((e as Error).message);
			return reply.status(500).send({ error: req.t("Server error") });
		}
	},

	async logout(req: FastifyRequest, reply: FastifyReply) {
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
			const sub = decoded.sub as unknown as JwtSubject;

			await redis.del(`session:${sub.id}`);

			reply.status(204).send();
		} catch (e) {
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

	async refresh(req: FastifyRequest, reply: FastifyReply) {
		try {
			const { refreshToken } = RefreshTokenSchema.parse(req.body);

			const decoded = jwt.verify(refreshToken, jwtConfig.secret, {
				algorithms: [jwtConfig.algorithm],
			}) as jwt.JwtPayload;

			if (decoded.type !== "refresh") {
				throw new UnauthorizedError(req.t("Invalid token type"));
			}

			const subject = decoded.sub as unknown as JwtSubject;

			if (!subject.id) {
				throw new UnauthorizedError(req.t("Invalid token subject"));
			}

			const refreshId = decoded.jti as string;

			const sessionId = `session:${subject.id}`;

			const rawUserSession = await redis.get(sessionId);

			if (!rawUserSession) {
				throw new NotFoundError(req.t("Session not found"));
			}

			const userSession = JSON.parse(rawUserSession) as {
				refreshId: string;
				version: number;
			};

			if (userSession.refreshId !== refreshId) {
				throw new UnauthorizedError(req.t("Invalid refresh token"));
			}

			const newVersion = userSession.version + 1;

			const tokens = createTokens({ ...subject }, newVersion);

			const user = await prisma.user.findUnique({
				where: {
					id: Number(subject.id),
				},
				select: {
					id: true,
					email: true,
					nickname: true,
				},
			});

			if (!user) {
				throw new NotFoundError(req.t("User not found"));
			}

			const session: Session = {
				id: user.id,
				email: user.email,
				name: user.nickname,
				nickname: user.nickname,
				// Hardware related info
				ipv4: req.ip as Session["ipv4"],
				userAgent: req.headers["user-agent"] || "unknown",
				// Token related info
				v: newVersion,
				refreshId: tokens.refreshId,
				provider: {
					type: OAuthProvider.NATIVE,
				},
			};

			await redis.set(
				sessionId,
				JSON.stringify(session),
				"EX",
				1 * 24 * 60 * 60, // session long 1 day max
			);

			return reply.status(200).send({
				message: req.t("Token refreshed successfully"),
				tokens,
				data: user,
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

			if (e instanceof NotFoundError) {
				return reply.status(404).send({ error: e.message });
			}

			if (e instanceof UnauthorizedError) {
				return reply.status(401).send({ error: e.message });
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

			// TODO: revoke thrid party sessions if the user logged in with OAuth provider (google, github, discord, etc)

			const decoded = jwt.verify(token, jwtConfig.secret, {
				algorithms: [jwtConfig.algorithm],
			}) as jwt.JwtPayload;
			const { id: userId } = decoded.sub as unknown as JwtSubject;

			const sessionExists = await redis.exists(`session:${userId}`);
			if (!sessionExists) {
				throw new NotFoundError(req.t("Session not found"));
			}
			const rawSession = await redis.get(`session:${userId}`);
			const session = JSON.parse(rawSession as string) as Session;

			const updatedSession: Session = {
				...session,
				v: session.v + 1,
			};

			redis.set(`session:${userId}`, JSON.stringify(updatedSession), "KEEPTTL");

			return reply.status(204).send();
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
