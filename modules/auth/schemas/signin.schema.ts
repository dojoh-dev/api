import { z } from "zod";

export const SignInSchema = z.object({
	email: z.email(),
	username: z.string().min(3).max(30),
	password: z.string().min(8),
});
