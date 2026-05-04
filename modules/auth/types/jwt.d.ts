export interface JwtSubject {
	id: string;
	email: string;
	nickname: string;
	name: string;
	version: number;
}

export interface JwtPayload {
	sub: JwtSubject;
	iat: number;
	exp: number;
	jti?: string;
	type: "access" | "refresh";
}
