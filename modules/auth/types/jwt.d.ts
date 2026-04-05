export interface JwtPayload {
	sub: JwtSubject;
	email: string;
	iat: number;
	exp: number;
}

export interface JwtSubject {
	id: string;
	email: string;
	username: string;
	name: string;
	avatarUrl: string;
	roles: string[];
}
