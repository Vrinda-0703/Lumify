export default function StatCard({
    title,
    amount,
    subtitle,
    percentage,
    icon,
    type = "default",
}) {
    return (
        <div className="surface p-5 rounded-2xl transition hover:-translate-y-1">
            <div className="flex items-start justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-secondary">
                        {title}
                    </p>
                    <h2
                        className={`text-2xl font-black mt-2 ${
                            type === "income"
                                ? "text-emerald-500"
                                : type === "expense"
                                ? "text-rose-500"
                                : "text-primary"
                        }`}
                    >
                        {amount}
                    </h2>
                    {subtitle && (
                        <p className="text-xs text-secondary mt-1">
                            {subtitle}
                        </p>
                    )}
                </div>

                <div className="text-right">
                    {icon && <div className="text-2xl">{icon}</div>}
                    {percentage && (
                        <p
                            className={`text-xs font-bold mt-2 ${
                                type === "expense" ? "text-rose-500" : "text-emerald-500"
                            }`}
                        >
                            {percentage}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}