import crypto from "node:crypto";

import jwt from "jsonwebtoken";

import jwtConfig from "@/config/jwt";

export const createTokens = (sub: unknown, version: number = 1) => {
	const exp = Math.floor(Date.now() / 1000) + 60 * 60; // 1 hour expiration
	const iat = Math.floor(Date.now() / 1000);
	const jti = crypto.randomUUID();

	const accessToken = jwt.sign(
		{
			exp,
			iat,
			sub,
			v: version,
			type: "access",
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
			jti,
		},
		jwtConfig.secret,
		{ algorithm: jwtConfig.algorithm },
	);

	return {
		accessToken,
		refreshToken,
		expiresIn: 60 * 60, // 1 hour in seconds
		issuedAt: iat,
		refreshId: jti,
	};
};
