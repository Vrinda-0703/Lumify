import { useEffect, useState } from "react";
import Sidebar from "../components/Sidebar/Sidebar";
import { aiService } from "../services/featureService";
import { addTransaction } from "../services/transactionService";
import { getAccounts } from "../services/accountService";
import {
    Sparkles,
    ShoppingCart,
    Mic,
    Square,
    Send,
    CheckCircle2,
    Check,
} from "lucide-react";
import { useCurrency } from "../context/CurrencyContext";

export default function AIAssistant() {
    const { money, currencySymbol } = useCurrency();
    const [query, setQuery] = useState("");
    const [answer, setAnswer] = useState("");
    const [healthData, setHealthData] = useState(null);
    const [item, setItem] = useState("");
    const [price, setPrice] = useState("");
    const [decision, setDecision] = useState(null);
    const [parsed, setParsed] = useState(null);
    const [accounts, setAccounts] = useState([]);
    const [account, setAccount] = useState("");
    const [listening, setListening] = useState(false);
    const [busy, setBusy] = useState(false);
    const [evalBusy, setEvalBusy] = useState(false);
    const [saved, setSaved] = useState(false);

    // Initial load of financial health score and accounts
    useEffect(() => {
        getAccounts().then(setAccounts).catch(() => {});
        aiService
            .ask("")
            .then((res) => {
                setHealthData(res);
                if (res.answer) setAnswer(res.answer);
            })
            .catch(() => {});
    }, []);

    const ask = async (customQuery) => {
        const q = (customQuery || query).trim();
        if (!q) return;
        setBusy(true);
        try {
            const r = await aiService.ask(q);
            setAnswer(r.answer);
            if (r.score) setHealthData(r);
            setSaved(false);
        } catch (e) {
            setAnswer(e.response?.data?.message || "Could not analyze your financial data.");
        } finally {
            setBusy(false);
        }
    };

    const voice = () => {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) {
            setAnswer("Voice recognition is not supported in this browser. Please try Google Chrome or Microsoft Edge.");
            return;
        }
        const r = new SR();
        r.lang = "en-IN";
        r.interimResults = false;
        r.onstart = () => setListening(true);
        r.onend = () => setListening(false);
        r.onerror = () => {
            setListening(false);
            setAnswer("Microphone access ended or encountered an error. Please try again.");
        };
        r.onresult = async (e) => {
            const text = e.results[0][0].transcript;
            setQuery(text);
            setBusy(true);
            try {
                const x = await aiService.voice(text);
                setParsed(x.parsed);
                setAnswer(
                    `I parsed: ${x.parsed.type} of ${money(x.parsed.amount)} in "${x.parsed.category}". Please review and confirm below before saving.`
                );
            } catch (err) {
                setAnswer(err.response?.data?.message || "Could not parse that voice recording.");
            } finally {
                setBusy(false);
            }
        };
        r.start();
    };

    const saveVoice = async () => {
        if (!parsed?.amount) return;
        setBusy(true);
        try {
            await addTransaction({
                title: parsed.title || parsed.category,
                amount: Number(parsed.amount),
                type: parsed.type,
                category: parsed.category,
                date: parsed.date || new Date().toISOString().slice(0, 10),
                account: account || null,
                note: "Saved via Lumify Voice Logging",
            });
            setSaved(true);
            setParsed(null);
            setAnswer("Transaction saved successfully to your ledger.");
        } catch (e) {
            setAnswer(e.response?.data?.message || "Could not save voice transaction.");
        } finally {
            setBusy(false);
        }
    };

    const evaluatePurchase = async (e) => {
        e?.preventDefault();
        if (!Number(price) || Number(price) <= 0) return;
        setEvalBusy(true);
        try {
            const res = await aiService.purchase({ item: item.trim() || "Item", price: Number(price) });
            setDecision(res);
        } catch (e) {
            setDecision({
                decision: "Error",
                reason: e.response?.data?.message || "Could not evaluate this purchase.",
            });
        } finally {
            setEvalBusy(false);
        }
    };

    const quickQueries = [
        "What is my daily burn rate?",
        "What is my emergency cash runway?",
        "What is my biggest expense?",
        "How much are my subscriptions?",
        "Do I have any upcoming bills?",
        "How much have I saved this month?",
    ];

    const score = healthData?.score !== undefined ? healthData.score : 0;
    const rating = healthData?.rating || (score === 0 ? "Unrated" : score >= 80 ? "Healthy" : score >= 60 ? "Good" : score >= 40 ? "Fair" : "Critical");

    return (
        <div className="page-shell">
            <Sidebar />
            <main className="page-main">
                {/* Header */}
                <div className="page-header">
                    <div>
                        <p className="eyebrow">INTELLIGENT FINANCIAL COPILOT</p>
                        <h1 className="page-title">Lumify Intelligence</h1>
                        <p className="page-subtitle">
                            Rule-based financial health scoring, proactive recommendations, and realistic purchase affordability evaluation.
                        </p>
                    </div>
                </div>

                {/* FINANCIAL HEALTH SCORE CARD */}
                <section
                    className="surface p-6 mb-8 rounded-3xl relative overflow-hidden"
                    style={{
                        background:
                            "linear-gradient(135deg, rgba(124, 58, 237, 0.08) 0%, rgba(6, 182, 212, 0.04) 100%), var(--bg-card)",
                        borderColor: "rgba(124, 58, 237, 0.25)",
                    }}
                >
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Sparkles className="text-violet-500" size={18} />
                                <h2 className="section-title">Financial Health Score</h2>
                            </div>
                            <p className="text-xs text-secondary max-w-lg">
                                Calculated from your savings rate, budget limits, overdue obligations, and subscription burden.
                            </p>

                            <div className="mt-4 flex items-baseline gap-3">
                                <span className="text-5xl font-black tracking-tight" style={{ color: "var(--text-primary)" }}>
                                    {score}
                                </span>
                                <span className="text-lg font-bold text-secondary">/ 100</span>
                                <span
                                    className={`badge ml-2 ${
                                        score >= 80
                                            ? "success"
                                            : score >= 60
                                            ? "info"
                                            : score >= 40
                                            ? "warning"
                                            : score > 0
                                            ? "danger"
                                            : "chip"
                                    }`}
                                >
                                    {rating}
                                </span>
                            </div>
                        </div>

                        {/* Factor Chips */}
                        <div className="flex-1 max-w-xl grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                            {(healthData?.factors || []).map((f, i) => (
                                <div
                                    key={i}
                                    className="surface-elevated p-3 rounded-xl flex items-center justify-between"
                                >
                                    <div>
                                        <p className="font-bold">{f.label}</p>
                                        <p className="text-[11px] text-secondary">{f.note}</p>
                                    </div>
                                    <span
                                        className={`font-black ml-2 ${
                                            f.status === "positive"
                                                ? "text-emerald-500"
                                                : f.status === "negative"
                                                ? "text-rose-500"
                                                : "text-secondary"
                                        }`}
                                    >
                                        {f.impact}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <div className="grid gap-7 lg:grid-cols-2">
                    {/* SECTION 1: PURCHASE DECISION ASSISTANT */}
                    <section className="surface p-6 rounded-3xl flex flex-col justify-between shadow-lg">
                        <div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-500 flex items-center justify-center">
                                    <ShoppingCart size={20} />
                                </div>
                                <div>
                                    <p className="eyebrow">SERIOUS DECISION TOOL</p>
                                    <h2 className="section-title mt-0.5">Purchase Decision Assistant</h2>
                                </div>
                            </div>
                            <p className="text-xs text-secondary mt-2 leading-relaxed">
                                Enter an item and price to evaluate whether you can truly afford it right now based on available funds, upcoming bills, subscriptions, and a safety buffer.
                            </p>

                            <form onSubmit={evaluatePurchase} className="mt-5 grid gap-3 sm:grid-cols-2">
                                <label className="field sm:col-span-2">
                                    What are you buying?
                                    <input
                                        className="input"
                                        placeholder="e.g. New Smartphone, Vacation Flights, Laptop"
                                        value={item}
                                        onChange={(e) => setItem(e.target.value)}
                                        required
                                    />
                                </label>
                                <label className="field">
                                    Price ({currencySymbol})
                                    <input
                                        className="input"
                                        type="number"
                                        min="1"
                                        placeholder="60000"
                                        value={price}
                                        onChange={(e) => setPrice(e.target.value)}
                                        required
                                    />
                                </label>
                                <div className="flex items-end">
                                    <button
                                        type="submit"
                                        disabled={evalBusy || !Number(price)}
                                        className="primary-btn w-full py-3"
                                    >
                                        {evalBusy ? "Evaluating…" : "Evaluate Affordability"}
                                    </button>
                                </div>
                            </form>

                            {/* Purchase Evaluation Results */}
                            {decision && (
                                <div
                                    className="surface-elevated mt-5 p-5 rounded-2xl border"
                                    style={{
                                        borderColor:
                                            decision.decision === "BUY"
                                                ? "rgba(16, 185, 129, 0.3)"
                                                : decision.decision === "WAIT"
                                                ? "rgba(245, 158, 11, 0.3)"
                                                : "rgba(244, 63, 94, 0.3)",
                                    }}
                                >
                                    <div className="flex items-center justify-between flex-wrap gap-2">
                                        <span
                                            className={`badge ${
                                                decision.decision === "BUY"
                                                    ? "success"
                                                    : decision.decision === "WAIT"
                                                    ? "warning"
                                                    : "danger"
                                            }`}
                                        >
                                            Recommendation: {decision.decision}
                                        </span>
                                        <span className="text-xs font-bold text-secondary">
                                            Affordability Score: {decision.affordabilityScore || 50}/100
                                        </span>
                                    </div>

                                    <h3 className="mt-3 text-lg font-black">{decision.item || item}</h3>
                                    <p className="mt-1 text-xs text-secondary leading-relaxed">
                                        {decision.reason}
                                    </p>

                                    {decision.goalImpact && (
                                        <p className="mt-2 text-xs text-cyan-500 font-medium">
                                            💡 {decision.goalImpact}
                                        </p>
                                    )}

                                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
                                        <div className="surface p-2.5 rounded-xl">
                                            <span className="text-secondary text-[11px] block">Available Funds</span>
                                            <strong className="mt-0.5 block">{money(decision.availableFunds)}</strong>
                                        </div>
                                        <div className="surface p-2.5 rounded-xl">
                                            <span className="text-secondary text-[11px] block">Upcoming Bills</span>
                                            <strong className="mt-0.5 block text-rose-500">{money(decision.upcomingBills)}</strong>
                                        </div>
                                        <div className="surface p-2.5 rounded-xl">
                                            <span className="text-secondary text-[11px] block">Subscriptions</span>
                                            <strong className="mt-0.5 block text-violet-500">{money(decision.monthlySubscriptions)}</strong>
                                        </div>
                                        <div className="surface p-2.5 rounded-xl">
                                            <span className="text-secondary text-[11px] block">Safety Buffer</span>
                                            <strong className="mt-0.5 block">{money(decision.safetyBuffer)}</strong>
                                        </div>
                                        <div className="surface p-2.5 rounded-xl sm:col-span-2">
                                            <span className="text-secondary text-[11px] block">Remaining After Purchase</span>
                                            <strong
                                                className={`mt-0.5 block ${
                                                    decision.remaining < 0 ? "text-rose-500" : "text-emerald-500"
                                                }`}
                                            >
                                                {money(decision.remaining)}
                                            </strong>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* SECTION 2: ASK LUMIFY & VOICE LOGGING */}
                    <section className="surface p-6 rounded-3xl flex flex-col justify-between shadow-lg">
                        <div>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl bg-violet-500/15 text-violet-500 flex items-center justify-center">
                                    <Sparkles size={20} />
                                </div>
                                <div>
                                    <p className="eyebrow">DIRECT INQUIRY</p>
                                    <h2 className="section-title mt-0.5">Ask Lumify Copilot</h2>
                                </div>
                            </div>

                            {/* Quick Questions */}
                            <div className="mt-3 flex flex-wrap gap-1.5">
                                {quickQueries.map((q) => (
                                    <button
                                        key={q}
                                        type="button"
                                        className="chip text-[11px] py-1"
                                        onClick={() => {
                                            setQuery(q);
                                            ask(q);
                                        }}
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>

                            <div className="mt-4 flex gap-2">
                                <textarea
                                    className="input min-h-24 resize-none text-xs"
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Ask anything or click the microphone to speak e.g. 'Spent 450 on dinner yesterday'…"
                                />
                                <button
                                    type="button"
                                    onClick={voice}
                                    className={`icon-btn shrink-0 w-11 flex flex-col items-center justify-center ${
                                        listening ? "text-rose-500 bg-rose-500/10 border-rose-500" : ""
                                    }`}
                                    title="Voice Transaction Logging"
                                >
                                    {listening ? <Square size={18} /> : <Mic size={18} />}
                                    <span className="text-[9px] mt-1 font-bold">
                                        {listening ? "Rec…" : "Voice"}
                                    </span>
                                </button>
                            </div>

                            <button
                                type="button"
                                disabled={busy || !query.trim()}
                                className="primary-btn mt-3 w-auto text-xs py-2 px-5"
                                onClick={() => ask()}
                            >
                                <Send size={14} /> {busy ? "Analyzing…" : "Ask Lumify"}
                            </button>

                            {/* AI / Rule-based Answer */}
                            {answer && (
                                <div className="surface-elevated mt-4 p-4 rounded-2xl text-xs leading-relaxed">
                                    <p style={{ color: "var(--text-primary)" }}>{answer}</p>
                                </div>
                            )}

                            {/* Voice Confirmation Card */}
                            {parsed && (
                                <div
                                    className="mt-4 p-4 rounded-2xl border"
                                    style={{ borderColor: "rgba(6, 182, 212, 0.3)", background: "var(--bg-elevated)" }}
                                >
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-xs flex items-center gap-1.5 text-cyan-500">
                                            <CheckCircle2 size={14} />
                                            Confirm Voice Transaction
                                        </h3>
                                        <span className="badge info text-[10px]">{parsed.confidence} confidence</span>
                                    </div>

                                    <div className="mt-3 grid gap-2.5 sm:grid-cols-2 text-xs">
                                        <label className="field">
                                            Title
                                            <input
                                                className="input py-1.5 text-xs"
                                                value={parsed.title}
                                                onChange={(e) => setParsed({ ...parsed, title: e.target.value })}
                                            />
                                        </label>
                                        <label className="field">
                                            Amount ({currencySymbol})
                                            <input
                                                className="input py-1.5 text-xs"
                                                type="number"
                                                value={parsed.amount}
                                                onChange={(e) => setParsed({ ...parsed, amount: e.target.value })}
                                            />
                                        </label>
                                        <label className="field">
                                            Category
                                            <input
                                                className="input py-1.5 text-xs"
                                                value={parsed.category}
                                                onChange={(e) => setParsed({ ...parsed, category: e.target.value })}
                                            />
                                        </label>
                                        <label className="field">
                                            Account
                                            <select
                                                className="input py-1.5 text-xs"
                                                value={account}
                                                onChange={(e) => setAccount(e.target.value)}
                                            >
                                                <option value="">General / Cash</option>
                                                {accounts.map((a) => (
                                                    <option key={a._id} value={a._id}>
                                                        {a.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                    </div>

                                    <div className="mt-4 flex items-center gap-2">
                                        <button
                                            type="button"
                                            disabled={busy || !Number(parsed.amount)}
                                            onClick={saveVoice}
                                            className="primary-btn text-xs py-2 px-4"
                                        >
                                            <Check size={14} /> Confirm &amp; Save
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setParsed(null)}
                                            className="secondary-btn text-xs py-2 px-3"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                </div>
                            )}

                            {saved && (
                                <p className="mt-2 text-xs text-emerald-500 font-semibold flex items-center gap-1">
                                    <CheckCircle2 size={14} /> Transaction saved to your records.
                                </p>
                            )}

                            {/* Recommendations Box */}
                            {(healthData?.recommendations || []).length > 0 && (
                                <div className="mt-5 space-y-2">
                                    <p className="eyebrow">PERSONALIZED RECOMMENDATIONS</p>
                                    {healthData.recommendations.map((r, i) => (
                                        <div key={i} className="surface-elevated p-3 rounded-xl text-xs">
                                            <span className="badge info text-[9px] mb-1">{r.category}</span>
                                            <p className="text-secondary mt-0.5">{r.text}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
