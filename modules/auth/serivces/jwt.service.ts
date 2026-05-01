import crypto from "node:crypto";

import jwt from "jsonwebtoken";

import jwtConfig from "@/config/jwt";

export const createTokens = (sub: unknown) => {
	const exp = Math.floor(Date.now() / 1000) + 60 * 60; // 1 hour expiration
	const iat = Math.floor(Date.now() / 1000);

	const accessToken = jwt.sign(
		{
			exp,
			iat,
			sub,
		},
		jwtConfig.secret,
		{ algorithm: jwtConfig.algorithm },
	);

	const refreshToken = jwt.sign(
		{
			exp,
			iat,
			sub,
			type: "refresh",
			tokenId: crypto.randomUUID(),
		},
		jwtConfig.secret,
		{ algorithm: jwtConfig.algorithm },
	);

	return {
		accessToken,
		refreshToken,
		expiresIn: 60 * 60, // 1 hour in seconds
		issuedAt: iat,
	};
};
