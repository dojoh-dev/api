import { z } from "zod";

export const createSignUpSchema = (t: i18next.TFunction) => {
	return z.object({
		email: z.email(),
		nickname: z
			.string()
			// Must start and end with an alphanumeric character, and can contain dots, underscores, or hyphens in between. Consecutive dots, underscores, or hyphens are not allowed.
			// Valid: "john_doe", "john.doe", "john-doe", "john123"
			// Invalid: "_john", "john_", "john..doe", "john__doe", "john--doe", "john.-doe", "john-.doe"
			.regex(/^[a-zA-Z0-9]([._-](?![._-])|[a-zA-Z0-9]){1,14}[a-zA-Z0-9]$/, {
				error: t("nickname_rules", { ns: "zod" }),
			})
			.min(3)
			.max(30),
		password: z.string().min(8),
	});
};
