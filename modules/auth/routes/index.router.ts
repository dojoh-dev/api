import AuthController from "@modules/auth/controllers/index.controller";
import type { FastifyInstance } from "fastify";

export default async function authRouter(f: FastifyInstance) {
	f.post("/login", AuthController.login);

	f.get("/login/google", async (request) => {
		//
	});

	f.post("/users", async (request) => {
		//
	});
}
