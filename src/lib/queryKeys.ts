// One place for every query / mutation key so hooks and realtime listeners never drift apart.

export const roomTimerKey = (roomId: string | undefined) =>
    ["room-timer", roomId] as const;

export const roomTasksKey = (roomId: string | undefined) =>
    ["room-tasks", roomId] as const;

export const roomMembersKey = (roomId: string | undefined) =>
    ["room-members", roomId] as const;

// All mutations that touch the tasks cache share this key. The realtime listener checks
// `isMutating` with it and skips echoes while one of our own mutations is in flight.
export const taskMutationKey = (roomId: string | undefined) =>
    ["room-tasks-mutation", roomId] as const;

export const focusSessionsKey = ["focus-sessions"] as const;

export const doneTasksKey = (userId: string | undefined) =>
    ["done-tasks-count", userId] as const;
