import { useTranslation } from "react-i18next";
import { Navigate, Outlet } from "react-router";
import { useAppSelector } from "@/store/hooks";

const GuestLayout = () => {
    const { t } = useTranslation();
    const { initialized, session } = useAppSelector((s) => s.auth);

    if (!initialized) {
        return (
            <p role="status" className="p-6 text-sm text-muted-foreground">
                {t("common.loading")}
            </p>
        );
    }
    if (session) return <Navigate to="/" replace />;

    return <Outlet />;
};
export default GuestLayout;
