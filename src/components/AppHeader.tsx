import { NavLink } from "react-router";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { supabase } from "@/lib/supabaseClient";
import { useAppSelector } from "@/store/hooks";

const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        isActive
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:text-foreground"
    }`;

const AppHeader = () => {
    const { t } = useTranslation();
    const user = useAppSelector((s) => s.auth.user);
    const name = user?.user_metadata?.display_name ?? user?.email;

    return (
        <>
            {/* Keyboard users jump past the header. Pages put id="main-content" on <main>. */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:start-2 focus:top-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow"
            >
                {t("common.skipToContent")}
            </a>
            <header className="border-b">
                <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 p-4">
                    <div className="flex items-center gap-4">
                        <span className="text-lg font-bold tracking-tight">
                            {t("common.appName")}
                        </span>
                        <nav aria-label={t("nav.main")} className="flex gap-1">
                            <NavLink to="/" end className={linkClass}>
                                {t("nav.rooms")}
                            </NavLink>
                            <NavLink to="/stats" className={linkClass}>
                                {t("nav.stats")}
                            </NavLink>
                        </nav>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="hidden text-sm text-muted-foreground sm:inline">
                            {name}
                        </span>
                        <LanguageSwitcher />
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => supabase.auth.signOut()}
                        >
                            {t("common.logout")}
                        </Button>
                    </div>
                </div>
            </header>
        </>
    );
};

export default AppHeader;
