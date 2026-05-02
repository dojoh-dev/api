import type { FastifyInstance } from "fastify";

import AuthController from "@/modules/auth/controllers/index.controller";

import { googleOauth } from "../controllers/google-oauth.controller";

export default async function authRouter(f: FastifyInstance) {
	f.post("/signup", AuthController.signup);

	f.post("/login", AuthController.login);

	f.post("/refresh", AuthController.refresh);

	f.delete("/revoke", AuthController.revoke);

	f.delete("/logout", AuthController.logout);

	f.get("/url/google", googleOauth.generateUrl);
	f.get("/callback/google", googleOauth.callback);

	// f.get("/url/github", githubOauth.generateUrl);
	// f.get("/callback/github", githubOauth.callback);

	// f.get("/url/discord", discordOauth.generateUrl);
	// f.get("/callback/discord", discordOauth.callback);
}
