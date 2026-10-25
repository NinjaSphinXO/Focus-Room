import "./App.css";
import { supabase } from "./lib/supabaseClient";

supabase.auth.getSession().then(({ data, error }) => {
    console.log("session:", data.session, "error:", error);
});
function App() {

    return <div></div>;
}

export default App;
