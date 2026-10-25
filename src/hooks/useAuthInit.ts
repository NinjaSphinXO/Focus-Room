import { useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useAppDispatch } from "../store/hooks";
import { setSession } from "../store/authSlice";

export function useAuthInit() {
    const dispatch = useAppDispatch();

    useEffect(() => {
        let active = true;

        // 1. Restore session from localStorage on first load
        supabase.auth.getSession().then(({ data }) => {
            if (active) dispatch(setSession(data.session));
        });

        // 2. Keep store in sync: login, logout, token refresh
        const {data: { subscription }} = supabase.auth.onAuthStateChange((_event, session) => {
            dispatch(setSession(session));
        });

        // 3. Cleanup
        return () => {
            active = false;
            subscription.unsubscribe();
        };
    }, [dispatch]);
}
