export const authorize = (...roles) => {
  return (req, res, next) => {
    // Check user exists
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const userRole = (req.user.role || "").toLowerCase();
    const normalizedRoles = roles.map((r) => String(r).toLowerCase());

    // Check role case-insensitively
    if (!normalizedRoles.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: `Access Denied: Role '${req.user.role}' is not authorized.`,
      });
    }

    next();
  };
};