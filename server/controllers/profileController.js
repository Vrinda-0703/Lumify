const User = require("../models/user");
const bcrypt = require("bcrypt");

const normalizeEmail = (v) => String(v || "").trim().toLowerCase();

const get = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("name email createdAt updatedAt");
        if (!user) return res.status(404).json({ message: "User not found" });
        res.json(user);
    } catch (e) {
        res.status(500).json({ message: "Could not load profile" });
    }
};

const update = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const name = String(req.body.name || "").trim();
        const email = normalizeEmail(req.body.email);

        if (name.length < 2 || name.length > 80) {
            return res.status(400).json({ message: "Name must be 2-80 characters" });
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ message: "Please enter a valid email address" });
        }

        if (email !== user.email) {
            const exists = await User.findOne({ email, _id: { $ne: user._id } }).select("_id");
            if (exists) return res.status(400).json({ message: "Unable to use this email address" });
        }

        user.name = name;
        user.email = email;
        await user.save();

        res.json({
            message: "Profile updated successfully",
            user: { id: user._id, name: user.name, email: user.email },
        });
    } catch (e) {
        res.status(400).json({ message: e.message || "Could not update profile" });
    }
};

const password = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("+password");
        if (!user) return res.status(404).json({ message: "User not found" });

        const currentPassword = String(req.body.currentPassword || "");
        const newPassword = String(req.body.newPassword || "");
        const confirmPassword = req.body.confirmPassword ? String(req.body.confirmPassword) : null;

        if (!currentPassword) {
            return res.status(400).json({ message: "Please enter your current password" });
        }

        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: "Current password is incorrect." });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({ message: "New password must be at least 8 characters." });
        }

        if (confirmPassword !== null && newPassword !== confirmPassword) {
            return res.status(400).json({ message: "New password and confirmation do not match." });
        }

        const isSameAsCurrent = await bcrypt.compare(newPassword, user.password);
        if (isSameAsCurrent) {
            return res.status(400).json({ message: "New password cannot be the same as your current password." });
        }

        user.password = await bcrypt.hash(newPassword, 12);
        await user.save();

        res.json({ message: "Password changed successfully." });
    } catch (e) {
        res.status(400).json({ message: "Unable to complete password change. Please try again." });
    }
};

module.exports = { get, update, password };
