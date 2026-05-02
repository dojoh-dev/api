import crypto from "node:crypto";

import jwt from "jsonwebtoken";

import jwtConfig from "@/config/jwt";

const REFRESH_TOKEN_GRACE_PERIOD_SECONDS = 10;

export const createTokens = (sub: unknown, version: number = 1) => {
	const now = Math.floor(Date.now() / 1000);
	const accessExp = now + jwtConfig.access.expiresIn;
	const refreshExp = now + jwtConfig.refresh.expiresIn + REFRESH_TOKEN_GRACE_PERIOD_SECONDS;
	const jti = crypto.randomUUID();

	const accessToken = jwt.sign(
		{
			exp: accessExp,
			iat: now,
			sub,
			v: version,
			type: "access",
		},
		jwtConfig.secret,
		{ algorithm: jwtConfig.algorithm },
	);

	const refreshToken = jwt.sign(
		{
			exp: refreshExp,
			iat: now,
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
		expiresIn: jwtConfig.access.expiresIn,
		issuedAt: now,
		refreshId: jti,
	};
};
