import { defineConfig, env } from "prisma/config";

export default defineConfig({
	schema: "database/prisma/schema.prisma",
	migrations: {
		path: "database/prisma/migrations",
	},
	engine: "classic",
	datasource: {
		url: env("DATABASE_URL"),
	},
});
