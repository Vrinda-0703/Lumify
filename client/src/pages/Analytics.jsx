import { useEffect, useMemo, useState } from "react";
import Sidebar from "../components/Sidebar/Sidebar";
import { getAnalyticsData } from "../services/analyticsService";
import {
    BarChart,
    Bar,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
    Legend,
} from "recharts";
import { Download, TrendingDown, TrendingUp, Sparkles } from "lucide-react";
import { useCurrency } from "../context/CurrencyContext";

const COLORS = ["#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#f43f5e", "#6366f1", "#ec4899"];

export default function Analytics() {
    const { money, currencySymbol, currency } = useCurrency();
    const now = new Date();
    const [month, setMonth] = useState(now.getMonth() + 1);
    const [year, setYear] = useState(now.getFullYear());
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const load = async () => {
        setLoading(true);
        try {
            setData(await getAnalyticsData(month, year));
            setError("");
        } catch (e) {
            setError(e.response?.data?.message || "Could not load analytics.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
    }, [month, year, currency]);

    const categories = useMemo(
        () =>
            Object.entries(data?.expenseByCategory || {})
                .map(([name, value]) => ({ name, value: Number(value) }))
                .sort((a, b) => b.value - a.value),
        [data]
    );

    const comparison = data?.budgetVsActual || [];

    const exportReport = () => {
        if (!data) return;
        const rows = [
            ["Metric", "Amount (INR)"],
            ["Income", data.incomeVsExpense?.income || 0],
            ["Expense", data.incomeVsExpense?.expense || 0],
            ["Savings", data.savings || 0],
            ["Savings Rate (%)", data.savingsRate || 0],
            ...categories.map((x) => [`Expense - ${x.name}`, x.value]),
        ];
        const csv = rows
            .map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(","))
            .join("\n");
        const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
        const a = document.createElement("a");
        a.href = url;
        a.download = `lumify-analytics-${year}-${String(month).padStart(2, "0")}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const monthName = new Date(2026, month - 1, 1).toLocaleString("en-IN", { month: "long" });

    return (
        <div className="page-shell">
            <Sidebar />
            <main className="page-main">
                <div className="page-header">
                    <div>
                        <p className="eyebrow">INTELLIGENT REPORTING</p>
                        <h1 className="page-title">Financial Analytics</h1>
                        <p className="page-subtitle">
                            Deep analysis of cash flow trends, budget variances, and spending categories.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <select
                            className="input w-auto text-xs"
                            value={month}
                            onChange={(e) => setMonth(Number(e.target.value))}
                        >
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1}>
                                    {new Date(2026, i, 1).toLocaleString("en-IN", { month: "long" })}
                                </option>
                            ))}
                        </select>
                        <select
                            className="input w-auto text-xs"
                            value={year}
                            onChange={(e) => setYear(Number(e.target.value))}
                        >
                            {Array.from({ length: 6 }, (_, i) => (
                                <option key={year - i} value={year - i}>
                                    {year - i}
                                </option>
                            ))}
                        </select>
                        <button
                            type="button"
                            className="secondary-btn text-xs"
                            onClick={exportReport}
                        >
                            <Download size={14} /> Export CSV
                        </button>
                    </div>
                </div>

                {error && <div className="alert error mb-5">{error}</div>}

                {loading || !data ? (
                    <div className="surface flex min-h-72 items-center justify-center text-secondary">
                        Generating your analytics report…
                    </div>
                ) : (
                    <>
                        <div className="stats-grid">
                            <Stat
                                title="Total Income"
                                value={money(data.incomeVsExpense?.income)}
                                tone="income"
                                icon={<TrendingUp size={16} />}
                            />
                            <Stat
                                title="Total Expenses"
                                value={money(data.incomeVsExpense?.expense)}
                                tone="expense"
                                icon={<TrendingDown size={16} />}
                            />
                            <Stat
                                title="Net Savings"
                                value={money(data.savings)}
                                tone={data.savings >= 0 ? "income" : "expense"}
                            />
                            <Stat
                                title="Savings Rate"
                                value={`${data.savingsRate || 0}%`}
                                tone="accent"
                            />
                        </div>

                        {/* Charts Grid */}
                        <div className="mt-6 grid gap-6 xl:grid-cols-2">
                            <ChartCard title="Monthly Cash Flow Overview">
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart
                                        data={[
                                            {
                                                name: `${monthName} ${year}`,
                                                Income: Number(data.incomeVsExpense?.income || 0),
                                                Expense: Number(data.incomeVsExpense?.expense || 0),
                                            },
                                        ]}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                                        <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={12} />
                                        <YAxis
                                            stroke="var(--text-muted)"
                                            fontSize={12}
                                            tickFormatter={(v) => `${currencySymbol}${v >= 1000 ? `${v / 1000}k` : v}`}
                                        />
                                        <Tooltip
                                            formatter={(v) => [money(v), ""]}
                                            contentStyle={{
                                                backgroundColor: "var(--bg-card)",
                                                borderColor: "var(--border)",
                                                color: "var(--text-primary)",
                                                borderRadius: "12px",
                                            }}
                                            itemStyle={{ color: "var(--text-primary)" }}
                                        />
                                        <Legend />
                                        <Bar dataKey="Income" fill="#10b981" radius={[8, 8, 0, 0]} />
                                        <Bar dataKey="Expense" fill="#f43f5e" radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>

                                {/* Concise data-driven cash flow explanation note */}
                                <div className="mt-4 rounded-2xl surface-elevated p-3.5 text-xs text-secondary border border-border">
                                    {Number(data.savings) > 0 ? (
                                        <p className="flex items-start gap-2">
                                            <span className="text-emerald-500 font-bold shrink-0">💡 Surplus:</span>
                                            <span>
                                                Net cash flow is positive by <strong className="text-emerald-500">{money(data.savings)}</strong> ({data.savingsRate}% savings rate). You retained more than you spent this month.
                                            </span>
                                        </p>
                                    ) : Number(data.savings) < 0 ? (
                                        <p className="flex items-start gap-2">
                                            <span className="text-rose-500 font-bold shrink-0">⚠️ Deficit:</span>
                                            <span>
                                                Expenses exceeded income by <strong className="text-rose-500">{money(Math.abs(data.savings))}</strong>. Consider adjusting discretionary spending to re-balance cash flow.
                                            </span>
                                        </p>
                                    ) : (
                                        <p className="flex items-start gap-2">
                                            <span className="text-cyan-500 font-bold shrink-0">⚖️ Balanced:</span>
                                            <span>Income matches expenses or no transactions recorded yet for this month.</span>
                                        </p>
                                    )}
                                </div>
                            </ChartCard>

                            <ChartCard title="Category Spending Proportions">
                                {categories.length > 0 ? (
                                    <>
                                        <ResponsiveContainer width="100%" height={280}>
                                            <PieChart>
                                                <Pie
                                                    data={categories}
                                                    dataKey="value"
                                                    nameKey="name"
                                                    cx="50%"
                                                    cy="50%"
                                                    outerRadius={95}
                                                    label={({ name, percent }) =>
                                                        `${name} ${(percent * 100).toFixed(0)}%`
                                                    }
                                                >
                                                    {categories.map((x, i) => (
                                                        <Cell
                                                            key={x.name}
                                                            fill={COLORS[i % COLORS.length]}
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    formatter={(v) => [money(v), ""]}
                                                    contentStyle={{
                                                        backgroundColor: "var(--bg-card)",
                                                        borderColor: "var(--border)",
                                                        color: "var(--text-primary)",
                                                        borderRadius: "12px",
                                                    }}
                                                    itemStyle={{ color: "var(--text-primary)" }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>

                                        {/* Concise data-driven category concentration note */}
                                        <div className="mt-4 rounded-2xl surface-elevated p-3.5 text-xs text-secondary border border-border">
                                            {(() => {
                                                const totalExp = categories.reduce((sum, c) => sum + c.value, 0);
                                                const topCat = categories[0];
                                                const topPct = totalExp > 0 ? Math.round((topCat.value / totalExp) * 100) : 0;
                                                const top3 = categories.slice(0, 3).reduce((s, c) => s + c.value, 0);
                                                const top3Pct = totalExp > 0 ? Math.round((top3 / totalExp) * 100) : 0;

                                                return (
                                                    <p className="flex items-start gap-2">
                                                        <span className="text-violet-500 font-bold shrink-0">📊 Concentration:</span>
                                                        <span>
                                                            <strong style={{ color: "var(--text-primary)" }}>{topCat.name}</strong> accounts for{" "}
                                                            <strong className="text-violet-500">{topPct}%</strong> ({money(topCat.value)}) of all monthly expenses. Top {Math.min(3, categories.length)} categories represent {top3Pct}% of outgoings.
                                                        </span>
                                                    </p>
                                                );
                                            })()}
                                        </div>
                                    </>
                                ) : (
                                    <div className="empty-state py-16">No expense records in this timeframe.</div>
                                )}
                            </ChartCard>
                        </div>

                        {/* Budget vs Actual Performance */}
                        <section className="surface mt-6 p-6">
                            <div>
                                <p className="eyebrow">BUDGET VS ACTUAL</p>
                                <h2 className="section-title mt-1">Variance Analysis</h2>
                            </div>
                            {comparison.length === 0 ? (
                                <div className="empty-state mt-5">
                                    No budgets configured for {monthName} {year}.
                                </div>
                            ) : (
                                <div className="mt-5 overflow-x-auto">
                                    <table className="w-full text-left text-sm">
                                        <thead>
                                            <tr
                                                className="border-b"
                                                style={{ borderColor: "var(--border)" }}
                                            >
                                                <th className="pb-3 text-secondary font-bold text-xs uppercase">
                                                    Category
                                                </th>
                                                <th className="pb-3 text-secondary font-bold text-xs uppercase">
                                                    Budget
                                                </th>
                                                <th className="pb-3 text-secondary font-bold text-xs uppercase">
                                                    Actual
                                                </th>
                                                <th className="pb-3 text-secondary font-bold text-xs uppercase">
                                                    Variance
                                                </th>
                                                <th className="pb-3 text-secondary font-bold text-xs uppercase">
                                                    Status
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {comparison.map((x) => (
                                                <tr
                                                    key={x.category}
                                                    className="transaction-row border-b"
                                                    style={{ borderColor: "var(--border)" }}
                                                >
                                                    <td className="py-3.5 font-bold">{x.category}</td>
                                                    <td>{money(x.budget)}</td>
                                                    <td>{money(x.actual)}</td>
                                                    <td
                                                        className={
                                                            x.budget - x.actual < 0
                                                                ? "text-rose-500 font-bold"
                                                                : "text-emerald-500 font-bold"
                                                        }
                                                    >
                                                        {money(x.budget - x.actual)}
                                                    </td>
                                                    <td>
                                                        <span
                                                            className={`badge ${
                                                                x.status === "Exceeded" ? "danger" : "success"
                                                            }`}
                                                        >
                                                            {x.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </section>

                        {/* Smart Insights from Analytics */}
                        <section className="surface mt-6 p-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Sparkles className="text-violet-500" size={18} />
                                <h2 className="section-title">Automated Insights</h2>
                            </div>
                            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                                {(data.insights || []).map((x, i) => (
                                    <div key={i} className="surface-elevated p-5 rounded-2xl">
                                        <h3 className="font-bold text-sm" style={{ color: "var(--accent)" }}>
                                            {x.title}
                                        </h3>
                                        <p className="mt-2 text-xs text-secondary leading-relaxed">
                                            {x.message}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </section>

                        {/* Top Categories Breakdown */}
                        <section className="surface mt-6 p-6">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <div>
                                    <p className="eyebrow">EXPENSE DISTRIBUTION</p>
                                    <h2 className="section-title mt-1">Category Breakdown</h2>
                                </div>
                                {data.topCategory && (
                                    <span className="chip text-xs">
                                        Top: {data.topCategory} ({money(data.topCategoryAmount)})
                                    </span>
                                )}
                            </div>
                            {categories.length === 0 ? (
                                <div className="empty-state mt-5">No expenses recorded for this period.</div>
                            ) : (
                                <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                    {categories.map((x, i) => (
                                        <div key={x.name} className="surface-elevated p-4 rounded-xl">
                                            <div className="flex items-center justify-between">
                                                <span className="font-bold text-sm">{x.name}</span>
                                                <span
                                                    className="h-3 w-3 rounded-full"
                                                    style={{ background: COLORS[i % COLORS.length] }}
                                                />
                                            </div>
                                            <p className="mt-2 text-xl font-extrabold">{money(x.value)}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    </>
                )}
            </main>
        </div>
    );
}

function Stat({ title, value, tone, icon }) {
    return (
        <div className="surface p-5">
            <div className="flex items-center justify-between">
                <p className="text-secondary text-xs uppercase font-bold tracking-wider">{title}</p>
                {icon && (
                    <span className={tone === "expense" ? "text-rose-500" : "text-emerald-500"}>
                        {icon}
                    </span>
                )}
            </div>
            <p
                className={`mt-2 text-2xl font-black ${
                    tone === "income"
                        ? "text-emerald-500"
                        : tone === "expense"
                        ? "text-rose-500"
                        : "text-cyan-500"
                }`}
            >
                {value}
            </p>
        </div>
    );
}

function ChartCard({ title, children }) {
    return (
        <section className="surface p-6">
            <h2 className="section-title mb-4">{title}</h2>
            <div>{children}</div>
        </section>
    );
}
