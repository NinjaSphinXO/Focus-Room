import { expect, type Page } from "@playwright/test";

export const uniqueEmail = (tag: string) =>
    `focusroom.e2e+${tag}${Date.now()}${Math.floor(Math.random() * 1e4)}@example.com`;

// Needs "Confirm email" OFF in the Supabase project used for e2e (use a separate project!).
export async function register(page: Page, name: string, email: string, password = "e2e-password-123") {
    await page.goto("/register");
    await page.getByLabel("Display name").fill(name);
    await page.getByLabel("Email address").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page.getByLabel("Confirm password").fill(password);
    await page.getByRole("button", { name: "Register" }).click();
    await expect(page.getByRole("heading", { name: "Focus rooms" })).toBeVisible();
}

export async function createRoom(page: Page, name: string) {
    await page.getByLabel("Room name").fill(name);
    await page.getByRole("button", { name: "Create room" }).click();
    await expect(page).toHaveURL(/\/room\/[A-Za-z0-9]{6}$/);
    return page.url().split("/").pop()!;
}

export async function joinRoom(page: Page, code: string) {
    await page.getByLabel("Room code").fill(code);
    await page.getByRole("button", { name: "Join room" }).click();
    await expect(page).toHaveURL(new RegExp(`/room/${code}$`, "i"));
}
