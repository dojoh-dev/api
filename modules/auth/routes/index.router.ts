import type { FastifyInstance } from "fastify";

import DiscordOauthController from "../controllers/discord-oauth.controller";
import GithubOauthController from "../controllers/github-oauth.controller";
import GoogleOauthController from "../controllers/google-oauth.controller";
import AuthController from "../controllers/index.controller";

export default async function authRouter(f: FastifyInstance) {
	f.post("/signup", AuthController.signup);

	f.post("/login", AuthController.login);

	f.post("/refresh", AuthController.refresh);

	f.delete("/revoke", AuthController.revoke);

	f.delete("/logout", AuthController.logout);

	f.get("/url/google", GoogleOauthController.generateUrl);
	f.get("/callback/google", GoogleOauthController.callback);

	f.get("/url/github", GithubOauthController.generateUrl);
	f.get("/callback/github", GithubOauthController.callback);

	f.get("/url/discord", DiscordOauthController.generateUrl);
	f.get("/callback/discord", DiscordOauthController.callback);
}
