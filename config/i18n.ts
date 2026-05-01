import path from "node:path";

import type * as i18next from "i18next";

export default {
	fallbackLng: "en-US",
	supportedLngs: ["en-US", "es-ES", "fr-FR", "pt-BR"],
	ns: ["messages", "errors", "zod"],
	defaultNS: "messages",
	backend: {
		loadPath: path.join(process.cwd(), "locales/{{lng}}/{{ns}}.json"),
	},
	interpolation: {
		escapeValue: false,
	},
} satisfies i18next.InitOptions;
