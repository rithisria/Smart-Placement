const jwt = require("jsonwebtoken");

const secret = process.env.JWT_SECRET || "development-secret-change-me";

function requireAuth(req, res, next) {
    const token = req.headers.authorization?.startsWith("Bearer ")
        ? req.headers.authorization.slice(7)
        : null;

    if (!token) return res.status(401).json({ message: "Authentication required" });

    try {
        req.auth = jwt.verify(token, secret);
        next();
    } catch {
        res.status(401).json({ message: "Your session has expired" });
    }
}

function requireAdmin(req, res, next) {
    if (req.auth?.role !== "admin") return res.status(403).json({ message: "Admin access required" });
    next();
}

module.exports = { requireAuth, requireAdmin };