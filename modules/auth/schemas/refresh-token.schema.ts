import { z } from "zod";

export const RefreshTokenSchema = z.object({
	refreshToken: z.string(),
});
