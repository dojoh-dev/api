import { z } from "zod";

export const DiscordUserSchema = z.object({
	id: z.string(),
	username: z.string(),
	avatar: z.string().optional(),
	email: z.email().optional(),
	discriminator: z.string().optional(),
	locale: z.string().optional(),
});
