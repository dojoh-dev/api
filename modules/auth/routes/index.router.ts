import type { FastifyInstance } from "fastify";

import AuthController from "@/modules/auth/controllers/index.controller";

export default async function authRouter(f: FastifyInstance) {
	f.post("/signup", AuthController.signUp);
	f.post("/login/sso", AuthController.logInViaSSO);
	// f.post("/login/google", AuthController.login);
	// f.post("/login/github", AuthController.login);
	// f.post("/login/discord", AuthController.login);
	f.post("/refresh", AuthController.refresh);
	f.delete("/revoke", AuthController.revoke);
	f.get("/logout", AuthController.logOut);
}
