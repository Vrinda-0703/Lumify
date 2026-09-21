const buckets = new Map();

function loginRateLimit({ windowMs = 15 * 60 * 1000, max = 10 } = {}) {
    return (req, res, next) => {
        const key = `${req.ip}:${String(req.body?.email || '').trim().toLowerCase()}`;
        const now = Date.now();
        const current = buckets.get(key);
        if (!current || now - current.start >= windowMs) {
            buckets.set(key, { start: now, count: 1 });
            return next();
        }
        current.count += 1;
        if (current.count > max) {
            return res.status(429).json({ message: "Too many login attempts. Please try again later." });
        }
        next();
    };
}

module.exports = { loginRateLimit };
