import { supabase } from "@/lib/supabaseClient";
import { useAppSelector } from "@/store/hooks";
import { Button } from "@/components/ui/button";

const Home = () => {
    const user = useAppSelector((s) => s.auth.user);
    return (
        <div className="p-4">
            <p>Logged in as {user?.email}</p>
            <Button onClick={() => supabase.auth.signOut()}>Logout</Button>
        </div>
    );
};
export default Home;