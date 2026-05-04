import crypto from "node:crypto";

import { OAuthProvider } from "@prisma/client";
import type { FastifyReply, FastifyRequest } from "fastify";
import { google } from "googleapis";

import env from "@/config/env";
import prisma from "@/database/prisma/client";
import redis from "@/database/redis/client";

import type { Session } from "../models/Session";
import { GoogleUserSchema } from "../schemas/google-user.schema";
import { createTokens } from "../serivces/jwt.service";

/**
 * To use OAuth2 authentication, we need access to a CLIENT_ID, CLIENT_SECRET, AND REDIRECT_URI
 * from the client_secret.json file. To get these credentials for your application, visit
 * https://console.cloud.google.com/apis/credentials.
 */
const oauth2Client = new google.auth.OAuth2(
	{
		clientId: env("GOOGLE_CLIENT_ID") as string,
	},
	env("GOOGLE_CLIENT_SECRET") as string,
	env("GOOGLE_REDIRECT_URI") as string,
);

const GoogleOauthController = {
	callback: async (req: FastifyRequest, reply: FastifyReply) => {
		const { code, state, error } = req.query as {
			code: string;
			state: string;
			error?: string;
		};

		if (error) {
			req.log.warn(`OAuth error: ${error}`);
			return reply.status(400).send(`OAuth error: ${error}`);
		}

		const storedState = req.cookies.oauth_state;

		if (state !== storedState) {
			req.log.warn("State mismatch. Possible CSRF attack");
			return reply.status(400).send("State mismatch. Possible CSRF attack");
		}

		const { tokens } = await oauth2Client.getToken(code);
		oauth2Client.setCredentials(tokens);

		const oauth2 = google.oauth2({
			auth: oauth2Client,
			version: "v2",
		});

		const { data } = await oauth2.userinfo.get();
		const googleUser = GoogleUserSchema.parse(data);

		if (!googleUser.id) {
			req.log.warn("Google user ID not found");
			return reply.status(400).send("Google user ID not found");
		}

		const googleUsername = googleUser.email.split("@")[0] as string;
		const oauthAccount = await prisma.oAuthAccount.upsert({
			where: {
				provider_user_id_idx: {
					provider: OAuthProvider.GOOGLE,
					provider_user_id: googleUser.id,
				},
			},
			update: {
				provider_username: googleUsername,
				provider_avatar_url: googleUser.picture,
				provider_metadata: {
					email: googleUser.email,
				},
			},
			create: {
				provider: OAuthProvider.GOOGLE,
				user_id: null, // Will be linked to a user account later
				provider_user_id: googleUser.id,
				provider_username: googleUser.name,
				provider_avatar_url: googleUser.picture,
				provider_metadata: {
					name: googleUser.name,
					email: googleUser.email,
				},
			},
		});

		const user = await prisma.user.upsert({
			where: {
				email: googleUser.email,
			},
			update: {
				// Do nothing, we don't want to overwrite existing user data
			},
			create: {
				email: googleUser.email,
				nickname: googleUsername,
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
				type: OAuthProvider.GOOGLE,
				accessToken: tokens.access_token || undefined,
				refreshToken: tokens.refresh_token || undefined,
			},
		};

		await redis.set(
			`session:${user.id}`,
			JSON.stringify(session),
			"EX",
			60 * 60 * 24 * 7, // 7 days
		);

		return reply.send({
			message: req.t("Logged in with Google successfully!"),
			tokens: jwtTokens,
			data: user,
		});
	},
	generateUrl: async (_req: FastifyRequest, reply: FastifyReply) => {
		const scopes: Array<string> = ["openid", "profile", "email"];

		// Generate a secure random state value.
		const state = crypto.randomBytes(32).toString("hex");

		// Store state in the session
		reply.setCookie("dojoh.oauth_state", state, {
			httpOnly: true,
			secure: true,
			sameSite: "lax",
			maxAge: 60 * 5, // 5m
		});

		// Generate a url that asks permissions for the Drive activity and Google Calendar scope
		const authorizationUrl = oauth2Client.generateAuthUrl({
			// 'online' (default) or 'offline' (gets refresh_token)
			access_type: "offline",
			/** Pass in the scopes array defined above.
			 * Alternatively, if only one scope is needed, you can pass a scope URL as a string */
			scope: scopes,
			// Enable incremental authorization. Recommended as a best practice.
			include_granted_scopes: true,
			// Include the state parameter to reduce the risk of CSRF attacks.
			state: state,
		});

		return reply.redirect(authorizationUrl);
	},
	oneTap: async (req: FastifyRequest, reply: FastifyReply) => {
		const { credential } = req.body as {
			credential: string;
		};
	},
};

export default GoogleOauthController;
