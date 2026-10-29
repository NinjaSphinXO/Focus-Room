import { test, expect } from "@playwright/test";
import { createRoom, joinRoom, register, uniqueEmail } from "./helpers";

// Two real browsers in one room: the whole product in one test.
test("host and member share presence, a timer and live tasks", async ({ browser }) => {
    const hostContext = await browser.newContext();
    const memberContext = await browser.newContext();
    const host = await hostContext.newPage();
    const member = await memberContext.newPage();

    // 1. both accounts exist, host creates a room, member joins with the code
    await register(host, "Hostie", uniqueEmail("host"));
    await register(member, "Guesty", uniqueEmail("guest"));
    const code = await createRoom(host, "E2E focus room");
    await joinRoom(member, code);

    // 2. presence: both see two online members
    await expect(host.getByText("Online", { exact: true })).toHaveCount(2);
    await expect(member.getByText("Online", { exact: true })).toHaveCount(2);

    // 3. permissions: only the host controls the timer
    await expect(host.getByRole("button", { name: "Start" })).toBeVisible();
    await expect(member.getByRole("button", { name: "Start" })).toHaveCount(0);
    await expect(member.getByText("The host controls the timer.")).toBeVisible();

    // 4. shared timer: host starts, the member's clock moves too
    await expect(member.getByRole("timer")).toHaveText("25:00");
    await host.getByRole("button", { name: "Start" }).click();
    await expect(member.getByRole("timer")).not.toHaveText("25:00");

    // 5. refresh mid-run keeps the right time (not back to 25:00)
    await member.reload();
    await expect(member.getByRole("timer")).not.toHaveText("25:00");

    // 6. live tasks: the host adds a task, the member sees it in Team tasks
    await host.getByLabel("New task").fill("Plan the week");
    await host.getByRole("button", { name: "Add" }).click();
    await expect(host.getByText("Plan the week")).toBeVisible();
    await expect(member.getByText("Plan the week")).toBeVisible();

    // 7. check it off: the member sees it done
    await host.getByRole("checkbox", { name: /Plan the week/ }).check();
    await expect(member.getByText("Done", { exact: true }).first()).toBeAttached();

    // 8. member leaves: back on the rooms page, room gone from their list
    await member.getByRole("button", { name: "Leave room" }).click();
    await expect(member.getByRole("heading", { name: "Focus rooms" })).toBeVisible();
    await expect(member.getByText("E2E focus room")).toHaveCount(0);

    await hostContext.close();
    await memberContext.close();
});

test("private rooms stay private: a stranger cannot open someone's room", async ({ browser }) => {
    const hostContext = await browser.newContext();
    const strangerContext = await browser.newContext();
    const host = await hostContext.newPage();
    const stranger = await strangerContext.newPage();

    await register(host, "Owner", uniqueEmail("owner"));
    await register(stranger, "Stranger", uniqueEmail("stranger"));
    const code = await createRoom(host, "Private room");

    await stranger.goto(`/room/${code}`);
    await expect(stranger.getByRole("heading", { name: "Room not found" })).toBeVisible();

    await hostContext.close();
    await strangerContext.close();
});
