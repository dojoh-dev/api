import { z } from "zod";

export const GithubUserSchema = z.object({
	id: z.string(),
	login: z.string(),
	avatar_url: z.url().optional(),
	email: z.email().optional(),
	name: z.string().optional(),
});
