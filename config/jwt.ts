import env from "./env";

export default {
	algorithm: "HS256",

	secret: env("JWT_SECRET", "default_secret"),

	access: {
		expiresIn: 60 * 60, // 1 hour in seconds
	},

	refresh: {
		expiresIn: 60 * 60, // 1 hour in seconds
	},
} satisfies JwtConfig;
