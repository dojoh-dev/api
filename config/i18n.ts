import path from "node:path";

export default {
	fallbackLng: "en-US",
	supportedLngs: ["en-US", "es-ES", "fr-FR", "pt-BR"],
	ns: ["messages", "errors"],
	defaultNS: "messages",
	backend: {
		loadPath: path.join(process.cwd(), "locales/{{lng}}/{{ns}}.json"),
	},
	interpolation: {
		escapeValue: false,
	},
};
