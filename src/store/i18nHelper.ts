import { translations } from "@/i18n/translations";
import type { AppStore } from "./types";

export function t(get: () => AppStore, key: string, params?: Record<string, string | number>): string {
  const lang = get().settings?.language || "en";
  const dict = translations[lang] || translations.en;
  let text = dict[key] || translations.en[key] || key;
  if (params) {
    Object.entries(params).forEach(([k, v]) => {
      text = text.replace(new RegExp(`{${k}}`, "g"), String(v));
    });
  }
  return text;
}
