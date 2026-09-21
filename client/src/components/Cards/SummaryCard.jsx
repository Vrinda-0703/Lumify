import { useCurrency } from "../../context/CurrencyContext";

export default function SummaryCard({ title, amount, color = "text-primary" }) {
    const { currencySymbol } = useCurrency();
    return (
        <div className="surface p-5 rounded-2xl flex-1">
            <h3 className="text-secondary text-xs uppercase font-bold tracking-wider">
                {title}
            </h3>
            <h2 className={`text-3xl font-black mt-2 ${color}`}>
                {currencySymbol}{amount}
            </h2>
        </div>
    );
}