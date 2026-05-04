import { z } from "zod";

export const createCredentialSchema = (t: i18next.TFunction) => {
	return z.object({
		identifier: z.email().or(
			z
				.string()
				// Must start and end with an alphanumeric character, and can contain dots, underscores, or hyphens in between. Consecutive dots, underscores, or hyphens are not allowed.
				// Valid: "john_doe", "john.doe", "john-doe", "john123"
				// Invalid: "_john", "john_", "john..doe", "john__doe", "john--doe", "john.-doe", "john-.doe"
				.regex(/^[a-zA-Z0-9]([._-](?![._-])|[a-zA-Z0-9]){1,14}[a-zA-Z0-9]$/, {
					error: t("nickname_rules", { ns: "zod" }),
				}),
		),
		password: z.string().min(8),
	});
};
