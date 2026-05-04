import type { FastifyInstance } from "fastify";

import jwtPlugin from "@/plugins/jwt";

import AuthController from "../controllers/index.controller";

export default async function authRouter(f: FastifyInstance) {
	f.post("/signup", AuthController.signup);
	f.post("/login", AuthController.login);

	await f.register(jwtPlugin);

	// Protected routes
	f.post("/refresh", AuthController.refresh);
	f.delete("/revoke", AuthController.revoke);
	f.delete("/logout", AuthController.logout);
}
