import env from "./env";

export default {
	postgres: {
		host: env("POSTGRES_HOST", "localhost"),
		port: env("POSTGRES_PORT", 5432),
		username: env("POSTGRES_USERNAME", "postgres"),
		password: env("POSTGRES_PASSWORD", "password"),
		database: env("POSTGRES_DATABASE", "dojoh"),
	},

	redis: {
		host: env("REDIS_HOST", "localhost"),
		port: env("REDIS_PORT", 6379),
		username: env("REDIS_USERNAME", "default"),
		password: env("REDIS_PASSWORD", ""),
	},
};
