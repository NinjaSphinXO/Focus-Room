import { useAppSelector } from "../store/hooks";
import { Navigate, Outlet } from "react-router";

const ProtectedLayout = () => {
    const { initialized, session } = useAppSelector((s) => s.auth);

    if (!initialized) return <p>Loading...</p>;
    if (!session) return <Navigate to="/login" replace />;

    return <Outlet />;
};
export default ProtectedLayout;
