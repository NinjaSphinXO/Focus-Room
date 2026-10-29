import { format, parseISO } from "date-fns";
import { useTranslation } from "react-i18next";
import { useDateLocale } from "@/lib/dateLocale";
import type { DayStat } from "@/lib/stats";

// Plain-div bar chart (no chart library). The visual part is hidden from screen readers
// and replaced by a real table, which is the accessible version of the same data.
const FocusChart = ({ data }: { data: DayStat[] }) => {
    const { t } = useTranslation();
    const locale = useDateLocale();
    const max = Math.max(...data.map((d) => d.minutes), 1);

    return (
        <figure>
            <div aria-hidden="true">
                <div className="flex h-40 items-end gap-1">
                    {data.map((d) => (
                        <div key={d.day} className="flex h-full flex-1 items-end">
                            <div
                                title={t("stats.barTitle", {
                                    date: format(parseISO(d.day), "PP", { locale }),
                                    minutes: d.minutes,
                                })}
                                className="w-full rounded-t bg-primary/80"
                                style={{
                                    height: `${(d.minutes / max) * 100}%`,
                                    minHeight: d.minutes > 0 ? 4 : 0,
                                }}
                            />
                        </div>
                    ))}
                </div>
                <div className="mt-1 flex gap-1 border-t pt-1">
                    {data.map((d) => (
                        <div
                            key={d.day}
                            className="flex-1 text-center text-[10px] leading-tight text-muted-foreground"
                        >
                            <div>{format(parseISO(d.day), "EEEEE", { locale })}</div>
                            <div>{format(parseISO(d.day), "d", { locale })}</div>
                        </div>
                    ))}
                </div>
            </div>

            <table className="sr-only">
                <caption>{t("stats.chartCaption", { days: data.length })}</caption>
                <thead>
                    <tr>
                        <th scope="col">{t("stats.tableDay")}</th>
                        <th scope="col">{t("stats.tableMinutes")}</th>
                    </tr>
                </thead>
                <tbody>
                    {data.map((d) => (
                        <tr key={d.day}>
                            <th scope="row">
                                {format(parseISO(d.day), "PP", { locale })}
                            </th>
                            <td>{d.minutes}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </figure>
    );
};

export default FocusChart;
