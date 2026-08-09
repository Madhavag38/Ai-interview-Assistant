const User = require("../models/User.js");

const requireRole = (...allowedRoles) => {
  return async (req, res, next) => {
    try {
      if (!req.userId) {
        return res.status(401).json({ message: "Authentication required" });
      }

      const user = await User.findById(req.userId);
      if (!user) {
        return res.status(404).json({ message: "User account not found" });
      }

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          message: `Access denied. Requires one of these roles: [${allowedRoles.join(", ")}]`,
        });
      }

      req.user = user;
      next();
    } catch (err) {
      res.status(500).json({ message: "Authorization check error", error: err.message });
    }
  };
};

module.exports = { requireRole };
