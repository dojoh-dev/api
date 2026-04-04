import crypto from "node:crypto";
import env from "@config/env";
import type { FastifyReply, FastifyRequest } from "fastify";
import jwt from "jsonwebtoken";
import { ZodError } from "zod";
import CredentialSchema from "../schemas/credential.schema";

const AuthController = {
	login(req: FastifyRequest, reply: FastifyReply) {
		try {
			const credentials = CredentialSchema.parse(req.body);

			const token = jwt.sign(
				{
					exp: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour expiration
					iat: Math.floor(Date.now() / 1000),
					sub: credentials,
				},
				env("JWT_SECRET") as string,
			);

			const refreshToken = jwt.sign(
				{
					exp: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days expiration
					iat: Math.floor(Date.now() / 1000),
					sub: credentials,
					type: "refresh",
					tokenId: crypto.randomUUID(),
				},
				env("JWT_SECRET") as string,
			);

			const response = {
				tokens: {
					token,
					refreshToken,
					expiresIn: 60 * 60, // 1 hour in seconds
				},
				user: {
					id: "12345",
					email: credentials.email,
					username: "@john_doe",
					name: "John Doe",
					avatarUrl: "https://example.com/avatar.jpg",
					roles: ["user"],
				},
			};

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

	logout() {
		//
	},

	refresh() {
		//
	},

	revoke() {
		//
	},
} as const;

export default AuthController;
