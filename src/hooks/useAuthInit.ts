import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabaseClient";
import { useAppDispatch } from "../store/hooks";
import { setSession } from "../store/authSlice";

export function useAuthInit() {
    const dispatch = useAppDispatch();
    const queryClient = useQueryClient();

    useEffect(() => {
        let active = true;

        // 1. Restore session from localStorage on first load
        supabase.auth.getSession().then(({ data }) => {
            if (active) dispatch(setSession(data.session));
        });

        // 2. Keep store in sync: login, logout, token refresh
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            dispatch(setSession(session));

            // Clear React Query cache on sign out to prevent data leaks/flashes between users
            if (event === "SIGNED_OUT") {
                queryClient.clear();
            }
        });

        // 3. Cleanup
        return () => {
            active = false;
            subscription.unsubscribe();
        };
    }, [dispatch, queryClient]);
}