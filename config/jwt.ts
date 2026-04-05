import env from "./env";

export default {
	algorithm: "HS256",

	secret: env("JWT_SECRET", "default_secret"),

	access: {
		expiresIn: Math.floor(Date.now() / 1000) + 60 * 60, // 1 hour in seconds
	},

	refresh: {
		expiresIn: Math.floor(Date.now() / 1000) + 7 * 24 * 60 * 60, // 7 days in seconds
	},
} satisfies JwtConfig;
