import { useAppStore } from "@/store/AppStore";
import { en } from "./en";
import { th } from "./th";

export type Locale = "en" | "th";

export const translations: Record<Locale, Record<string, string>> = {
  en,
  th,
};

export function useTranslation() {
  const store = useAppStore();
  const lang = store.settings.language || "en";

  const t = (key: string, params?: Record<string, string | number>): string => {
    const dict = translations[lang] || translations.en;
    let text = dict[key] || translations.en[key] || key;
    
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(new RegExp(`{${k}}`, "g"), String(v));
      });
    }
    return text;
  };

  return { t, locale: lang };
}
