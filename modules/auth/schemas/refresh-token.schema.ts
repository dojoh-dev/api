import { z } from "zod";

const RefreshTokenSchema = z.object({
	refreshToken: z.string(),
});

export default RefreshTokenSchema;
