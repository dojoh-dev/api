import { z } from "zod";

const CredentialSchema = z.object({
	email: z.email(),
	password: z.string().min(8),
});

export default CredentialSchema;
