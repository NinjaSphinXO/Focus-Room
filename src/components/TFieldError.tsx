import { useTranslation } from "react-i18next";
import { FieldError } from "@/components/ui/field";

// Zod messages are translation keys, so translate them before showing.
const TFieldError = ({ error }: { error?: { message?: string } }) => {
    const { t } = useTranslation();
    if (!error?.message) return null;
    return <FieldError errors={[{ message: t(error.message) }]} />;
};

export default TFieldError;
