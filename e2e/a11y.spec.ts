import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

for (const path of ["/login", "/register"]) {
    test(`no WCAG A/AA violations on ${path}`, async ({ page }) => {
        await page.goto(path);
        await expect(page.getByRole("main")).toBeVisible();
        const results = await new AxeBuilder({ page })
            .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
            .analyze();
        // Fix what shows up here: that is the point of the test.
        expect(results.violations).toEqual([]);
    });
}

test("switching to Arabic flips the page to RTL and remembers it", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("html")).toHaveAttribute("dir", "ltr");

    await page.getByRole("button", { name: "Switch language" }).click();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl");
    await expect(page.locator("html")).toHaveAttribute("lang", "ar");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("dir", "rtl"); // persisted
});
