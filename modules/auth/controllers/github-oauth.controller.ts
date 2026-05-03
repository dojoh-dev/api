import crypto from "node:crypto";

import { OAuthProvider } from "@prisma/client";
import type { FastifyReply, FastifyRequest } from "fastify";

import env from "@/config/env";
import prisma from "@/database/prisma/client";
import redis from "@/database/redis/client";
import {
	generateCodeChallenge,
	generateCodeVerifier,
} from "@/shared/utils/crypto";

import type { Session } from "../models/Session";
import { GithubUserSchema } from "../schemas/github-user.schema";
import { createTokens } from "../serivces/jwt.service";

const GithubOauthController = {
	callback: async (req: FastifyRequest, reply: FastifyReply) => {
		const { code, state } = req.query as {
			code: string;
			state: string;
		};

		const storedState = req.cookies["oauth_state"];
		const verifier = req.cookies["oauth_verifier"];

		if (!storedState || !verifier) {
			req.log.warn("Missing state or code verifier in cookies");
			return reply
				.status(400)
				.send("Missing state or code verifier in cookies");
		}

		if (state !== storedState) {
			req.log.warn("State mismatch. Possible CSRF attack");
			return reply.status(400).send("State mismatch. Possible CSRF attack");
		}

		const tokenResponse = await fetch(
			"https://github.com/login/oauth/access_token",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Accept: "application/json",
				},
				body: JSON.stringify({
					client_id: env("GITHUB_CLIENT_ID"),
					client_secret: env("GITHUB_CLIENT_SECRET"),
					code,
					code_verifier: verifier,
					redirect_uri: env("GITHUB_REDIRECT_URI"),
				}),
			},
		);

		if (!tokenResponse.ok) {
			const content = await tokenResponse.text();
			req.log.warn(`Failed to obtain access token from GitHub: ${content}`);
			return reply
				.status(400)
				.send("Failed to obtain access token from GitHub");
		}

		const tokens = (await tokenResponse.json()) as {
			access_token: string;
			scope: string;
			token_type: string;
		};

		if (!tokens.access_token) {
			req.log.warn("Failed to obtain access token from GitHub");
			return reply
				.status(400)
				.send("Failed to obtain access token from GitHub");
		}

		const userResponse = await fetch("https://api.github.com/user", {
			headers: {
				Authorization: `Bearer ${tokens.access_token}`,
				Accept: "application/json",
			},
		});

		if (!userResponse.ok) {
			req.log.warn(
				`Failed to fetch user info from GitHub: ${await userResponse.text()}`,
			);
			return reply.status(400).send("Failed to fetch user info from GitHub");
		}

		const userData = await userResponse.json();
		const githubUser = GithubUserSchema.parse(userData);

		if (!githubUser.id) {
			req.log.warn("Github user ID not found");
			return reply.status(400).send("Github user ID not found");
		}

		const oauthAccount = await prisma.oAuthAccount.upsert({
			where: {
				provider_user_id_idx: {
					provider: OAuthProvider.GITHUB,
					provider_user_id: githubUser.id,
				},
			},
			update: {
				provider_username: githubUser.name,
				provider_avatar_url: githubUser.avatar_url || null,
				provider_metadata: {
					email: githubUser.email,
					name: githubUser.name,
				},
			},
			create: {
				provider: OAuthProvider.GITHUB,
				user_id: null, // Will be linked to a user account later
				provider_user_id: githubUser.id,
				provider_username: githubUser.login,
				provider_avatar_url: githubUser.avatar_url,
				provider_metadata: {
					email: githubUser.email,
					name: githubUser.name,
				},
			},
		});

		const user = await prisma.user.upsert({
			where: githubUser.email
				? { email: githubUser.email }
				: { nickname: githubUser.login },
			update: {
				// Do nothing, we don't want to overwrite existing user data
			},
			create: {
				email: githubUser.email ?? "",
				nickname: githubUser.login,
			},
			select: {
				id: true,
				email: true,
				nickname: true,
				password: false,
			},
		});

		// Not need to wait for this, if it fails we can just log it and move on
		prisma.oAuthAccount
			.update({
				where: {
					id: oauthAccount.id,
				},
				data: {
					user_id: user.id,
				},
			})
			.catch((e) => {
				req.log.warn(
					"Failed to link OAuth account to user: " +
						JSON.stringify(
							{
								userId: user.id,
								oauthAccountId: oauthAccount.id,
								error: (e as Error).message,
							},
							null,
							2,
						),
				);
			});

		const { refreshId, ...jwtTokens } = createTokens(
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
			refreshId,
			provider: {
				type: OAuthProvider.GITHUB,
				accessToken: tokens.access_token || undefined,
			},
		};

		await redis.set(
			`session:${user.id}`,
			JSON.stringify(session),
			"EX",
			60 * 60 * 24 * 7, // 7 days
		);

		return reply.send({
			message: req.t("Logged in with Github successfully!"),
			tokens: jwtTokens,
			data: user,
		});
	},
	generateUrl: async (_: FastifyRequest, reply: FastifyReply) => {
		const verifier = generateCodeVerifier();
		const challenge = await generateCodeChallenge(verifier);
		const state = crypto.randomBytes(32).toString("hex");

		const params = new URLSearchParams({
			client_id: env("GITHUB_CLIENT_ID") as string,
			redirect_uri: env("GITHUB_REDIRECT_URI") as string,
			scope: ["user:email", "read:user"].join(" "),
			state,
			code_challenge_method: "S256",
			code_challenge: challenge,
		});

		reply.setCookie("oauth_state", state, {
			httpOnly: true,
			secure: true,
			sameSite: "lax",
			maxAge: 60 * 5, // 5m
		});

		reply.setCookie("oauth_verifier", verifier, {
			httpOnly: true,
			secure: true,
			sameSite: "lax",
			maxAge: 60 * 5, // 5m
		});

		const url = new URL(
			`/login/oauth/authorize?${params.toString()}`,
			"https://github.com",
		);

		const authorizationUrl = url.toString();

		return reply.redirect(authorizationUrl);
	},
};

export default GithubOauthController;
