const CURRENCY_MAP = {
    INR: { symbol: "₹", locale: "en-IN" },
    USD: { symbol: "$", locale: "en-US" },
    EUR: { symbol: "€", locale: "en-IE" },
    GBP: { symbol: "£", locale: "en-GB" },
};

function getCurrency(req) {
    const raw = req?.headers?.["x-currency"] || "INR";
    const code = String(raw).toUpperCase().trim();
    const config = CURRENCY_MAP[code] || CURRENCY_MAP.INR;
    return {
        code,
        symbol: config.symbol,
        locale: config.locale,
        format: (amount) => {
            const num = Math.round(Number(amount) || 0);
            return `${config.symbol}${num.toLocaleString(config.locale)}`;
        },
    };
}

module.exports = { getCurrency, CURRENCY_MAP };
