import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type { Session, User } from "@supabase/supabase-js";

interface AuthState {
    session: Session | null;
    user: User | null;
    initialized: boolean;
}

const initialState: AuthState = {
    session: null,
    user: null,
    initialized: false,
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setSession: (state, action: PayloadAction<Session | null>) => {
            state.session = action.payload;
            state.user = action.payload?.user ?? null;
            state.initialized = true;
        },
    },
});

export const { setSession } = authSlice.actions;
export default authSlice.reducer;