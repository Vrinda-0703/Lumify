const Tesseract = require("tesseract.js");

const inferCategory = (text) => {
    const rules = [
        [/grocery|supermarket|food|restaurant|cafe|dinner|lunch/i, "Food"],
        [/uber|ola|metro|fuel|petrol|transport/i, "Transport"],
        [/amazon|flipkart|clothing|fashion|shopping/i, "Shopping"],
        [/netflix|movie|cinema|game/i, "Entertainment"],
        [/pharmacy|medicine|hospital|doctor|health/i, "Health"],
    ];
    return rules.find(([regex]) => regex.test(text))?.[1] || "Other";
};

const extract = async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "Receipt image is required" });
    try {
        const result = await Tesseract.recognize(req.file.path, "eng");
        const text = result.data.text || "";
        const lines = text.split(/\n/).map((x) => x.trim()).filter(Boolean);
        let amount = null;
        for (const line of lines) {
            if (/grand\s*total|total|amount due|net amount|payable/i.test(line)) {
                const match = line.match(/(?:₹|rs\.?|inr)?\s*(\d+[\d,]*(?:\.\d{1,2})?)/i);
                if (match) { amount = Number(match[1].replace(/,/g, "")); break; }
            }
        }
        if (amount == null) {
            const numbers = [...text.matchAll(/(?:₹|rs\.?|inr)?\s*(\d+[\d,]*(?:\.\d{1,2})?)/gi)]
                .map((m) => Number(m[1].replace(/,/g, "")))
                .filter((n) => n > 0 && n < 1000000);
            amount = numbers.length ? Math.max(...numbers) : null;
        }
        const dateMatch = text.match(/\b(\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4})\b/);
        const merchant = lines.find((x) => x.length > 2 && !/invoice|receipt|tax|gst|date|total|amount|phone|address/i.test(x)) || "";
        const category = inferCategory(text);
        const confidence = amount && merchant ? "high" : amount ? "medium" : "low";
        res.json({ fileName: req.file.originalname, fileUrl: `/uploads/${req.file.filename}`, extracted: { merchant, amount, date: dateMatch ? dateMatch[1] : null, category, confidence }, rawText: text });
    } catch (e) { res.status(500).json({ message: `OCR failed: ${e.message}` }); }
};

module.exports = { extract };
