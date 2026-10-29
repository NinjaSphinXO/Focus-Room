import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import en from "./locales/en.json";
import ar from "./locales/ar.json";

const STORAGE_KEY = "focusroom-lang";

const readSaved = () => {
    try {
        return localStorage.getItem(STORAGE_KEY);
    } catch {
        return null; // storage blocked
    }
};

const saved = readSaved();
const initial =
    saved === "ar" || saved === "en"
        ? saved
        : navigator.language.startsWith("ar")
          ? "ar"
          : "en";

// <html lang dir>: this is what makes the whole layout flip for Arabic (RTL)
export const applyDocumentLanguage = (lng: string) => {
    document.documentElement.lang = lng;
    document.documentElement.dir = lng === "ar" ? "rtl" : "ltr";
};

i18n.use(initReactI18next).init({
    resources: { en: { translation: en }, ar: { translation: ar } },
    lng: initial,
    fallbackLng: "en",
    interpolation: { escapeValue: false }, // React already escapes
});

applyDocumentLanguage(initial);

i18n.on("languageChanged", (lng) => {
    applyDocumentLanguage(lng);
    try {
        localStorage.setItem(STORAGE_KEY, lng);
    } catch {
        // storage blocked: language just will not persist
    }
});

export default i18n;
