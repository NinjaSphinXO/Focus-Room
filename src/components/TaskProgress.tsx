import { useTranslation } from "react-i18next";

const TaskProgress = ({ done, total }: { done: number; total: number }) => {
    const { t } = useTranslation();
    const percent = total === 0 ? 0 : Math.round((done / total) * 100);

    return (
        <div className="flex items-center gap-2">
            <div
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={total}
                aria-valuenow={done}
                aria-label={t("tasks.progressLabel", { done, total })}
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
            >
                <div
                    className="h-full bg-primary transition-all"
                    style={{ width: `${percent}%` }}
                />
            </div>
            <span className="text-xs tabular-nums text-muted-foreground">
                {t("tasks.progress", { done, total })}
            </span>
        </div>
    );
};

export default TaskProgress;
