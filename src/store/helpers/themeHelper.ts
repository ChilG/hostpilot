// Helper to apply theme classes dynamically
export const applyThemeClass = (theme: "dark" | "light" | "system") => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  if (theme === "system") {
    const systemTheme = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    root.classList.add(systemTheme);
  } else {
    root.classList.add(theme);
  }
};

// Helper to apply language attributes dynamically
export const applyLanguageClass = (lang: "en" | "th") => {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.lang = lang;
};
