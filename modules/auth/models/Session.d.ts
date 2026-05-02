import type { User } from "@/modules/users/models/User";
import type { OAuthProvider } from "@prisma/client";

export interface Session extends User {
	ipv4: `${number}.${number}.${number}.${number}`;
	refreshId: string;
	userAgent: string;
	v: number;
	provider: {
		type: OAuthProvider;
		refreshToken?: string;
		accessToken?: string;
	};
}
