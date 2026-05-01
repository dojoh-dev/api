import { z } from "zod";

export const CredentialSchema = z.object({
	email: z.email(),
	password: z.string().min(8),
});
