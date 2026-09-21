const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const normalizeEmail = (value) => String(value || "").trim().toLowerCase();

const validateCredentials = (name, email, password) => {
    if (!name || name.trim().length < 2) return "Name must be at least 2 characters.";
    if (name.trim().length > 80) return "Name is too long.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Please enter a valid email.";
    if (!password || password.length < 8) return "Password must be at least 8 characters.";
    return null;
};

const signup = async (req, res) => {
    try {
        const name = String(req.body.name || "").trim();
        const email = normalizeEmail(req.body.email);
        const password = String(req.body.password || "");
        const validation = validateCredentials(name, email, password);
        if (validation) return res.status(400).json({ message: validation });

        const existing = await User.findOne({ email }).select("_id");
        if (existing) return res.status(400).json({ message: "Unable to create account with these details." });

        const hashedPassword = await bcrypt.hash(password, 12);
        await User.create({ name, email, password: hashedPassword });
        return res.status(201).json({ message: "Account created successfully. Please log in." });
    } catch (error) {
        if (error.code === 11000) return res.status(400).json({ message: "Unable to create account with these details." });
        return res.status(500).json({ message: "Unable to create account right now." });
    }
};

const login = async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const password = String(req.body.password || "");
        if (!email || !password) return res.status(400).json({ message: "Invalid email or password" });

        const user = await User.findOne({ email }).select("+password name email");
        const valid = user ? await bcrypt.compare(password, user.password) : false;
        if (!valid) return res.status(401).json({ message: "Invalid email or password" });

        const token = jwt.sign(
            { id: user._id.toString(), email: user.email, name: user.name },
            process.env.JWT_SECRET,
            { expiresIn: "7d" }
        );
        return res.json({
            message: "Login successful",
            token,
            user: { id: user._id, name: user.name, email: user.email },
        });
    } catch (error) {
        return res.status(500).json({ message: "Unable to log in right now." });
    }
};

module.exports = { signup, login };
