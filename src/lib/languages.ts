// Shown to every first-time visitor (see components/LanguagePrompt.tsx). `native` is the
// language's own name — an international buyer scanning this list should be able to spot
// theirs without reading English first. `label` is the English name, and that's what gets
// stored on the order/subscription, so the owner reads "Japanese" (not "ja" or "日本語")
// when deciding what language to reply in.
export type Language = { native: string; label: string };

export const LANGUAGES: Language[] = [
  { native: "English", label: "English" },
  { native: "Filipino", label: "Filipino" },
  { native: "日本語", label: "Japanese" },
  { native: "한국어", label: "Korean" },
  { native: "中文", label: "Chinese" },
  { native: "Español", label: "Spanish" },
  { native: "Français", label: "French" },
  { native: "Deutsch", label: "German" },
  { native: "Italiano", label: "Italian" },
  { native: "Português", label: "Portuguese" },
  { native: "Nederlands", label: "Dutch" },
  { native: "Bahasa Indonesia", label: "Indonesian" },
  { native: "Bahasa Melayu", label: "Malay" },
  { native: "ไทย", label: "Thai" },
  { native: "Tiếng Việt", label: "Vietnamese" },
  { native: "हिन्दी", label: "Hindi" },
  { native: "العربية", label: "Arabic" },
  { native: "Русский", label: "Russian" },
];

const STORAGE_KEY = "dmph:native-language";
// Separate from the value itself so "I closed the prompt without picking" is remembered
// too — otherwise a visitor who skips gets asked again on every single page load.
const ASKED_KEY = "dmph:native-language-asked";

function safeGet(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    // Private browsing / storage disabled — the prompt just shows again next visit.
    return null;
  }
}

function safeSet(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* ignore — see safeGet */
  }
}

export function getNativeLanguage(): string | null {
  return safeGet(STORAGE_KEY);
}

export function hasBeenAsked(): boolean {
  return safeGet(ASKED_KEY) === "1";
}

export function saveNativeLanguage(label: string | null): void {
  safeSet(ASKED_KEY, "1");
  if (label) safeSet(STORAGE_KEY, label);
}