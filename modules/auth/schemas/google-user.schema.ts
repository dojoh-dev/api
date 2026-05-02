import { z } from "zod";

export const GoogleUserSchema = z.object({
	id: z.string(),
	email: z.email(),
	name: z.string(),
	picture: z.url().optional(),
});
