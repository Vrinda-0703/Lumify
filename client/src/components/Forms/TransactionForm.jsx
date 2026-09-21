import { useEffect, useRef, useState } from "react";
import { X, Upload, ScanLine, CheckCircle2 } from "lucide-react";
import { getCategories, addCategory } from "../../services/categoryService";
import { extractReceiptDetails } from "../../services/receiptService";
import { getAccounts } from "../../services/accountService";
import { sharedBudgetService } from "../../services/featureService";
import { useCurrency } from "../../context/CurrencyContext";

const today = () => new Date().toISOString().slice(0, 10);
const normalizeDate = (s) => {
    if (!s) return today();
    const m = String(s).match(/(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})/);
    if (!m) return today();
    let y = m[3];
    if (y.length === 2) y = `20${y}`;
    return `${y}-${String(m[2]).padStart(2, "0")}-${String(m[1]).padStart(2, "0")}`;
};

export default function TransactionForm({ onSubmit, onCancel, initialData, lockType = false }) {
    const { currencySymbol } = useCurrency();
    const isTypeLocked = lockType || Boolean(initialData?.type && !initialData?._id);
    const [form, setForm] = useState({
        title: "",
        amount: "",
        type: initialData?.type || "Expense",
        category: "",
        date: today(),
        account: "",
        receiptUrl: "",
        receiptFileName: "",
        sharedBudget: "",
    });
    const [cats, setCats] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [sharedBudgets, setSharedBudgets] = useState([]);
    const [file, setFile] = useState(null);
    const [preview, setPreview] = useState("");
    const [status, setStatus] = useState("");
    const [busy, setBusy] = useState(false);
    const [newCat, setNewCat] = useState("");
    const [catModal, setCatModal] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        const load = async () => {
            setForm({
                title: initialData?.title || "",
                amount: initialData?.amount || "",
                type: initialData?.type || "Expense",
                category: initialData?.category || "",
                date: initialData?.date
                    ? new Date(initialData.date).toISOString().slice(0, 10)
                    : today(),
                account: initialData?.account?._id || initialData?.account || "",
                sharedBudget: initialData?.sharedBudget?._id || initialData?.sharedBudget || "",
                receiptUrl: initialData?.receiptUrl || "",
                receiptFileName: initialData?.receiptFileName || "",
            });
            setPreview("");
            setFile(null);
            setStatus("");
            setNewCat("");
            setCatModal(false);

            const currentUserId = String(user.id || user._id || "");
            const currentUserEmail = String(user.email || "").toLowerCase();

            try {
                const results = await Promise.allSettled([
                    getCategories(),
                    getAccounts(),
                    sharedBudgetService.list(),
                ]);
                const c = results[0].status === "fulfilled" ? results[0].value : [];
                const a = results[1].status === "fulfilled" ? results[1].value : [];
                const sh = results[2].status === "fulfilled" ? results[2].value : [];

                setCats(Array.isArray(c) ? c : []);
                setAccounts(Array.isArray(a) ? a : []);
                const available = (Array.isArray(sh) ? sh : []).filter(
                    (x) =>
                        (currentUserId && String(x.owner?._id || x.owner) === currentUserId) ||
                        (currentUserEmail && String(x.owner?.email || "").toLowerCase() === currentUserEmail) ||
                        (x.members || []).some(
                            (m) =>
                                m.status === "accepted" &&
                                ((currentUserId && String(m.user?._id || m.user) === currentUserId) ||
                                    (currentUserEmail && String(m.email || "").toLowerCase() === currentUserEmail))
                        )
                );
                setSharedBudgets(available);
            } catch {
                setStatus("Could not load categories or accounts.");
            }
        };
        load();
    }, [initialData]);

    const choose = async (e) => {
        const f = e.target.files?.[0];
        if (!f) return;
        if (!/^image\/(jpeg|png|webp)$/i.test(f.type)) {
            return setStatus("Please choose a JPG, PNG or WEBP image.");
        }
        if (f.size > 5 * 1024 * 1024) {
            return setStatus("Receipt must be smaller than 5 MB.");
        }

        setFile(f);
        setPreview(URL.createObjectURL(f));
        setBusy(true);
        setStatus("Scanning receipt with OCR…");

        try {
            const r = await extractReceiptDetails(f);
            const x = r.extracted || {};
            setForm((v) => ({
                ...v,
                title: x.merchant || v.title,
                amount: x.amount || v.amount,
                date: x.date ? normalizeDate(x.date) : v.date,
                category: x.category && x.category !== "Other" ? x.category : v.category,
                receiptUrl: r.fileUrl || v.receiptUrl,
                receiptFileName: r.fileName || f.name,
            }));
            setStatus(
                x.amount || x.merchant || x.date
                    ? "Receipt scanned! Please review extracted details below before saving."
                    : "Receipt uploaded, but details were unclear. Please verify and edit fields manually."
            );
        } catch (err) {
            setStatus(
                err.response?.data?.message ||
                    "Receipt scanning failed. You can still enter details manually."
            );
        } finally {
            setBusy(false);
        }
    };

    const add = async () => {
        if (!newCat.trim()) return;
        setBusy(true);
        try {
            const c = await addCategory({ name: newCat.trim(), type: form.type });
            setCats((v) => [...v, c]);
            setForm((v) => ({ ...v, category: c.name }));
            setNewCat("");
            setCatModal(false);
            setStatus(`Category “${c.name}” added.`);
        } catch (e) {
            setStatus(e.response?.data?.message || "Could not add category");
        } finally {
            setBusy(false);
        }
    };

    const submit = async (e) => {
        e.preventDefault();
        if (
            !form.title.trim() ||
            !Number(form.amount) ||
            Number(form.amount) <= 0 ||
            !form.category ||
            !form.date
        ) {
            return setStatus("Please complete Title, Amount, Category, and Date.");
        }

        setBusy(true);
        try {
            await onSubmit({
                ...form,
                title: form.title.trim(),
                amount: Number(form.amount),
                account: form.account || null,
                sharedBudget: form.sharedBudget || null,
            });
        } catch (e) {
            setStatus(e.response?.data?.message || "Could not save transaction");
        } finally {
            setBusy(false);
        }
    };

    const filteredCats = cats.filter((c) => c.type === form.type);

    return (
        <div className="modal-backdrop" onClick={onCancel}>
            <div
                className="modal-card max-w-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div
                    className="flex items-start justify-between pb-5 border-b"
                    style={{ borderColor: "var(--border)" }}
                >
                    <div>
                        <p className="eyebrow">MONEY ACTIVITY</p>
                        <h2 className="section-title mt-1">
                            {initialData?._id
                                ? "Edit Transaction"
                                : form.type === "Income"
                                ? "Add Income"
                                : "Add Expense"}
                        </h2>
                        <p className="text-xs text-secondary mt-0.5">
                            {form.type === "Income"
                                ? "Record an incoming deposit, salary, or transfer."
                                : "Record and categorize an expense."}
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onCancel}
                        className="icon-btn"
                        aria-label="Close modal"
                    >
                        <X size={18} />
                    </button>
                </div>

                <form onSubmit={submit} className="mt-6 grid gap-4 sm:grid-cols-2">
                    {/* Transaction Type Toggle - only shown when type is not pre-set/locked */}
                    {!isTypeLocked && (
                        <div className="sm:col-span-2">
                            <label className="field mb-1">Transaction Type</label>
                            <div className="grid grid-cols-2 gap-3">
                                {["Expense", "Income"].map((t) => (
                                    <button
                                        type="button"
                                        key={t}
                                        onClick={() => setForm((v) => ({ ...v, type: t, category: "" }))}
                                        className={`py-2.5 px-4 rounded-xl border text-sm font-bold transition ${
                                            form.type === t
                                                ? t === "Income"
                                                    ? "border-emerald-500 bg-emerald-500/15 text-emerald-500"
                                                    : "border-rose-500 bg-rose-500/15 text-rose-500"
                                                : "border-border bg-elevated text-secondary"
                                        }`}
                                    >
                                        {t === "Income" ? "↑ Income" : "↓ Expense"}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Title */}
                    <label className="field sm:col-span-2">
                        Title / Merchant
                        <input
                            className="input"
                            value={form.title}
                            onChange={(e) => setForm({ ...form, title: e.target.value })}
                            placeholder="e.g. Grocery Store, Client Invoice, Uber"
                            required
                        />
                    </label>

                    {/* Amount */}
                    <label className="field">
                        Amount ({currencySymbol})
                        <input
                            className="input"
                            type="number"
                            min="0.01"
                            step="0.01"
                            value={form.amount}
                            onChange={(e) => setForm({ ...form, amount: e.target.value })}
                            placeholder="500"
                            required
                        />
                    </label>

                    {/* Date */}
                    <label className="field">
                        Date
                        <input
                            className="input"
                            type="date"
                            value={form.date}
                            onChange={(e) => setForm({ ...form, date: e.target.value })}
                            required
                        />
                    </label>

                    {/* Category */}
                    <label className="field">
                        Category
                        <div className="flex gap-2">
                            <select
                                className="input flex-1"
                                value={form.category}
                                onChange={(e) => setForm({ ...form, category: e.target.value })}
                                required
                            >
                                <option value="">Select category</option>
                                {filteredCats.map((c) => (
                                    <option key={c._id} value={c.name}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={() => setCatModal(true)}
                                className="primary-btn px-3 text-base"
                                title="Add custom category"
                            >
                                +
                            </button>
                        </div>
                    </label>

                    {/* Account */}
                    <label className="field">
                        Account / Wallet
                        <div className="relative">
                            <select
                                className="input"
                                value={form.account}
                                onChange={(e) => setForm({ ...form, account: e.target.value })}
                            >
                                <option value="">No account (Cash / General)</option>
                                {accounts.map((a) => (
                                    <option key={a._id} value={a._id}>
                                        {a.name} ({a.type})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </label>

                    {/* Shared Budget */}
                    {sharedBudgets.length > 0 && (
                        <label className="field sm:col-span-2">
                            Shared Budget (Optional)
                            <select
                                className="input"
                                value={form.sharedBudget || ""}
                                onChange={(e) => setForm({ ...form, sharedBudget: e.target.value })}
                            >
                                <option value="">Not part of a shared budget</option>
                                {sharedBudgets.map((b) => (
                                    <option key={b._id} value={b._id}>
                                        {b.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    )}

                    {/* Receipt OCR Upload Section */}
                    <div
                        className="sm:col-span-2 p-4 rounded-2xl border"
                        style={{ borderColor: "var(--border)", background: "var(--bg-elevated)" }}
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <h3 className="font-bold text-sm flex items-center gap-1.5">
                                    <ScanLine size={16} className="text-violet-500" />
                                    Receipt OCR Scanner
                                </h3>
                                <p className="text-xs text-secondary mt-0.5">
                                    Upload a receipt photo to automatically extract merchant, amount, and date.
                                </p>
                            </div>
                            <input
                                ref={inputRef}
                                hidden
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                onChange={choose}
                            />
                            <button
                                type="button"
                                disabled={busy}
                                onClick={() => inputRef.current?.click()}
                                className="secondary-btn text-xs shrink-0"
                            >
                                <Upload size={14} />
                                {busy ? "Scanning…" : "Upload Receipt"}
                            </button>
                        </div>

                        {status && (
                            <p className="mt-3 text-xs text-cyan-500 font-medium flex items-center gap-1.5">
                                <CheckCircle2 size={14} /> {status}
                            </p>
                        )}

                        {preview && (
                            <div className="mt-3 flex items-center gap-3">
                                <img
                                    src={preview}
                                    alt="Receipt preview"
                                    className="h-16 w-16 rounded-xl object-cover border"
                                    style={{ borderColor: "var(--border)" }}
                                />
                                <div>
                                    <p className="text-xs font-semibold">{file?.name || form.receiptFileName}</p>
                                    <p className="text-[11px] text-secondary">
                                        Review extracted fields above before saving.
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="sm:col-span-2 mt-4 flex items-center justify-end gap-3">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="secondary-btn"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={busy}
                            className="primary-btn px-6"
                        >
                            {busy
                                ? "Saving…"
                                : initialData
                                ? "Update Transaction"
                                : "Add Transaction"}
                        </button>
                    </div>
                </form>

                {/* Custom Category Quick Modal */}
                {catModal && (
                    <div
                        className="modal-backdrop"
                        style={{ zIndex: 80 }}
                        onClick={() => setCatModal(false)}
                    >
                        <div
                            className="modal-card max-w-sm"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex justify-between items-center">
                                <h3 className="section-title">New Category</h3>
                                <button
                                    type="button"
                                    className="icon-btn"
                                    onClick={() => setCatModal(false)}
                                >
                                    <X size={16} />
                                </button>
                            </div>
                            <p className="text-xs text-secondary mt-1">
                                Add a category for {form.type.toLowerCase()} transactions.
                            </p>
                            <input
                                autoFocus
                                className="input mt-4"
                                value={newCat}
                                onChange={(e) => setNewCat(e.target.value)}
                                placeholder="e.g. Freelance, Cafe, Utilities"
                                onKeyDown={(e) => e.key === "Enter" && add()}
                            />
                            <div className="mt-4 flex justify-end gap-2">
                                <button
                                    type="button"
                                    onClick={() => setCatModal(false)}
                                    className="secondary-btn"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    disabled={busy || !newCat.trim()}
                                    onClick={add}
                                    className="primary-btn"
                                >
                                    Add Category
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
