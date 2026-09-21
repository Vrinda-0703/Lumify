const jwt = require("jsonwebtoken");
const User = require("../models/user");

const protect = async (req, res, next) => {
    const header = req.headers.authorization || "";
    if (!header.startsWith("Bearer ")) return res.status(401).json({ message: "Not authorized" });
    const token = header.slice(7).trim();
    if (!token || !process.env.JWT_SECRET) return res.status(401).json({ message: "Not authorized" });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        if (!decoded?.id) return res.status(401).json({ message: "Not authorized" });

        let email = decoded.email ? String(decoded.email).trim().toLowerCase() : undefined;
        let name = decoded.name || "";

        if (!email) {
            try {
                const user = await User.findById(decoded.id).select("email name");
                if (user) {
                    email = user.email ? String(user.email).trim().toLowerCase() : "";
                    name = user.name || "";
                }
            } catch {
                // fall through with decoded.id
            }
        }

        req.user = { id: decoded.id, email, name };
        next();
    } catch (error) {
        return res.status(401).json({ message: "Invalid or expired session" });
    }
};

module.exports = protect;
