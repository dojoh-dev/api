import type { FastifyInstance } from "fastify";

import AuthController from "@/modules/auth/controllers/index.controller";

export default async function authRouter(f: FastifyInstance) {
	f.post("/login", AuthController.login);
	f.get("/logout", AuthController.logout);
	f.post("/refresh", AuthController.refresh);
	f.delete("/revoke", AuthController.revoke);
}
