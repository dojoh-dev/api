interface JwtConfig {
	algorithm: "HS256" | "RS256" | "ES256";
	secret: string;
	access: {
		expiresIn: TimeStamp; // e.g., 60 * 60 (1 hour in seconds)
	};
	refresh: {
		expiresIn: TimeStamp; // e.g., 7 * 24 * 60 * 60 (7 days in seconds)
	};
}
