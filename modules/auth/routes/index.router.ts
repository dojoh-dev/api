import AuthController from "@modules/auth/controllers/index.controller";
import type { FastifyInstance } from "fastify";

export default async function authRouter(f: FastifyInstance) {
	f.post("/login", AuthController.login);
	f.get("/logout", AuthController.logout);
	f.post("/refresh", AuthController.refresh);
	f.delete("/revoke", AuthController.revoke);
}
