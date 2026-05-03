import type { FastifyInstance } from "fastify";

import DiscordOauthController from "../controllers/discord-oauth.controller";
import GithubOauthController from "../controllers/github-oauth.controller";
import GoogleOauthController from "../controllers/google-oauth.controller";

export default async function oauthRouter(f: FastifyInstance) {
	f.get("/url/google", GoogleOauthController.generateUrl);
	f.get("/callback/google", GoogleOauthController.callback);

	f.get("/url/github", GithubOauthController.generateUrl);
	f.get("/callback/github", GithubOauthController.callback);

	f.get("/url/discord", DiscordOauthController.generateUrl);
	f.get("/callback/discord", DiscordOauthController.callback);
}
