import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import i18n from "@/i18n";

// Tests always run in English, whatever the machine language is
await i18n.changeLanguage("en");

afterEach(() => {
    cleanup();
});
