import { useTranslation } from "react-i18next";
import { Languages } from "lucide-react";
import { Button } from "@/components/ui/button";

const LanguageSwitcher = () => {
    const { i18n, t } = useTranslation();
    const isAr = i18n.language === "ar";

    return (
        <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => i18n.changeLanguage(isAr ? "en" : "ar")}
            aria-label={t("lang.switchLabel")}
        >
            <Languages className="h-4 w-4" aria-hidden="true" />
            {/* the label is written in the language you switch TO */}
            <span lang={isAr ? "en" : "ar"}>{isAr ? "English" : "العربية"}</span>
        </Button>
    );
};

export default LanguageSwitcher;
