export const generateCodeVerifier = (length = 128) => {
	const charset =
		"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
	let result = "";
	const randomValues = crypto.getRandomValues(new Uint8Array(length));

	for (let i = 0; i < length; i++) {
		result += charset[(randomValues[i] as number) % charset.length];
	}

	return result;
};

export const generateCodeChallenge = async (verifier: string) => {
	const encoder = new TextEncoder();
	const data = encoder.encode(verifier);

	const digest = await crypto.subtle.digest("SHA-256", data);

	return btoa(String.fromCharCode(...new Uint8Array(digest)))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=+$/, "");
};
