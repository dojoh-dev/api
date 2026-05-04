import crypto from "node:crypto";

import { OAuthProvider } from "@prisma/client";
import type { FastifyReply, FastifyRequest } from "fastify";

import env from "@/config/env";
import prisma from "@/database/prisma/client";
import redis from "@/database/redis/client";

import type { Session } from "../models/Session";
import { DiscordUserSchema } from "../schemas/discord-user.schema";
import { createTokens } from "../serivces/jwt.service";

const DiscordOauthController = {
	callback: async (req: FastifyRequest, reply: FastifyReply) => {
		const { code, state } = req.query as {
			code: string;
			state: string;
		};

		const storedState = req.cookies.oauth_state;

		if (state !== storedState) {
			req.log.warn("State mismatch. Possible CSRF attack");
			return reply.status(400).send("State mismatch. Possible CSRF attack");
		}

		const basicToken = Buffer.from(
			`${env("DISCORD_CLIENT_ID")}:${env("DISCORD_CLIENT_SECRET")}`,
		).toString("base64");
		const urlencoded = new URLSearchParams({
			grant_type: "authorization_code",
			code,
			redirect_uri: env("DISCORD_REDIRECT_URI") as string,
		});
		const tokenResponse = await fetch(
			"https://discord.com/api/v10/oauth2/token",
			{
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
					Authorization: `Basic ${basicToken}`,
				},
				body: urlencoded.toString(),
			},
		);

		if (!tokenResponse.ok) {
			const content = await tokenResponse.text();
			req.log.warn(`Failed to obtain access token from Discord: ${content}`);
			return reply
				.status(400)
				.send("Failed to obtain access token from Discord");
		}

		const tokens = (await tokenResponse.json()) as {
			access_token: string;
			token_type: "Bearer";
			expires_in: number;
			refresh_token: string;
			scope: "identify";
		};

		if (!tokens.access_token) {
			req.log.warn("Failed to obtain access token from Discord");
			return reply
				.status(400)
				.send("Failed to obtain access token from Discord");
		}

		const userResponse = await fetch("https://discord.com/api/v10/users/@me", {
			headers: {
				Authorization: `Bearer ${tokens.access_token}`,
			},
		});

		if (!userResponse.ok) {
			const content = await userResponse.text();
			req.log.warn(`Failed to obtain user info from Discord: ${content}`);
			return reply.status(400).send("Failed to obtain user info from Discord");
		}

		const userData = await userResponse.json();
		const discordUser = DiscordUserSchema.parse(userData);

		if (!discordUser.id) {
			req.log.warn("Discord user ID not found");
			return reply.status(400).send("Discord user ID not found");
		}

		const discordEmail =
			discordUser.email || `${discordUser.id}@discord.oauth.local`;

		const oauthAccount = await prisma.oAuthAccount.upsert({
			where: {
				provider_user_id_idx: {
					provider: OAuthProvider.DISCORD,
					provider_user_id: discordUser.id,
				},
			},
			update: {
				provider_username: discordUser.username,
				provider_avatar_url: discordUser.avatar
					? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
					: null,
				provider_metadata: {
					email: discordUser.email,
					lng: discordUser.locale,
					discriminator: discordUser.discriminator,
				},
			},
			create: {
				provider: OAuthProvider.DISCORD,
				user_id: null, // Will be linked to a user account later
				provider_user_id: discordUser.id,
				provider_username: discordUser.username,
				provider_avatar_url: discordUser.avatar
					? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
					: null,
				provider_metadata: {
					email: discordUser.email,
					locale: discordUser.locale,
					discriminator: discordUser.discriminator,
				},
			},
		});

		const user = await prisma.user.upsert({
			where: {
				email: discordUser.email,
			},
			update: {
				// Do nothing, we don't want to overwrite existing user data
			},
			create: {
				email: discordUser.email || "",
				nickname: discordUser.username,
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
				type: OAuthProvider.DISCORD,
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
			message: req.t("Logged in with Discord successfully!"),
			tokens: jwtTokens,
			data: user,
		});
	},
	generateUrl: async (_: FastifyRequest, reply: FastifyReply) => {
		const state = crypto.randomBytes(32).toString("hex");

		const params = new URLSearchParams({
			response_type: "code",
			client_id: env("DISCORD_CLIENT_ID") as string,
			redirect_uri: env("DISCORD_REDIRECT_URI") as string,
			scope: ["identify", "email"].join(" "),
			prompt: "consent", // Always ask user to select account
			integration_type: "1", // USER_INSTALL
			state,
		});

		reply.setCookie("dojoh.oauth_state", state, {
			httpOnly: true,
			secure: true,
			sameSite: "lax",
			maxAge: 60 * 5, // 5m
		});

		const url = new URL(
			`/oauth2/authorize?${params.toString()}`,
			"https://discord.com",
		);

		const authorizationUrl = url.toString();

		return reply.redirect(authorizationUrl);
	},
} as const;

export default DiscordOauthController;
