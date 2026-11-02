import crypto from "crypto";
import { sendEmail } from "../utils/emailService.js";
import User from "../models/user.model.js";
import logger from "../config/logger.js";
import { createAuditLog } from "./auditLog.controller.js";

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private (Admin)
export const getAllUsers = async (req, res) => {
  try {
    const users = await User.find({}).select("-password").sort({ createdAt: -1 });
    res.status(200).json({ success: true, users });
  } catch (error) {
    logger.error("Error in getAllUsers:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Get logged in user profile
// @route   GET /api/v1/users/me
// @access  Private
export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.status(200).json({ success: true, user });
  } catch (error) {
    logger.error("Error in getMyProfile:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Update user profile
// @route   PUT /api/v1/users/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (user) {
      user.fullName = req.body.fullName || user.fullName;
      user.email = req.body.email || user.email;
      
      if (req.body.password) {
        user.password = req.body.password;
      }

      const updatedUser = await user.save();
      
      res.status(200).json({
        success: true,
        user: {
          _id: updatedUser._id,
          fullName: updatedUser.fullName,
          email: updatedUser.email,
          role: updatedUser.role,
        }
      });
    } else {
      res.status(404).json({ success: false, message: "User not found" });
    }
  } catch (error) {
    logger.error("Error in updateProfile:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Update user role
// @route   PUT /api/v1/users/:id/role
// @access  Private (Admin)
export const updateUserRole = async (req, res) => {
  try {
    const { role } = req.body;
    
    if (!['admin', 'developer', 'viewer'].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role" });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Prevent removing the last admin
    if (user.role === 'admin' && role !== 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ success: false, message: "Cannot remove the last admin" });
      }
    }

    user.role = role;
    await user.save();

    res.status(200).json({ success: true, message: "User role updated", user });
  } catch (error) {
    logger.error("Error in updateUserRole:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Delete user
// @route   DELETE /api/v1/users/:id
// @access  Private (Admin)
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Prevent removing the last admin or oneself
    if (user.role === 'admin') {
      const adminCount = await User.countDocuments({ role: 'admin' });
      if (adminCount <= 1) {
        return res.status(400).json({ success: false, message: "Cannot remove the last admin" });
      }
    }
    
    if (req.user._id.toString() === req.params.id) {
        return res.status(400).json({ success: false, message: "Cannot delete yourself from this interface" });
    }

    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "User removed" });
  } catch (error) {
    logger.error("Error in deleteUser:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

// @desc    Invite a new user and send confirmation email
// @route   POST /api/v1/users/invite
// @access  Private (Admin)
export const inviteUser = async (req, res) => {
  try {
    const { fullName, email, role } = req.body;

    if (!fullName || !email) {
      return res.status(400).json({
        success: false,
        message: "Full Name and Email are required",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists with this email address",
      });
    }

    const validRoles = ["admin", "developer", "viewer"];
    const assignedRole = role && validRoles.includes(role.toLowerCase()) ? role.toLowerCase() : "developer";

    // Generate temporary password and reset token
    const randomSuffix = crypto.randomBytes(3).toString("hex");
    const tempPassword = `CloudOps#${randomSuffix}2026`;
    const resetToken = crypto.randomBytes(24).toString("hex");
    const resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");
    const resetPasswordExpire = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    const newUser = await User.create({
      fullName: fullName.trim(),
      email: normalizedEmail,
      password: tempPassword,
      role: assignedRole,
      isVerified: false,
      resetPasswordToken,
      resetPasswordExpire,
    });

    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const inviteUrl = `${frontendUrl}/reset-password/${resetToken}`;
    const loginUrl = `${frontendUrl}/login`;
    const adminName = req.user?.fullName || "Administrator";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b0f19; color: #e2e8f0; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
          .header { background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); padding: 32px 24px; text-align: center; border-bottom: 1px solid #1e293b; }
          .logo-text { font-size: 24px; font-weight: 800; color: #60a5fa; letter-spacing: 1.5px; }
          .logo-sub { font-size: 11px; color: #a855f7; letter-spacing: 3px; display: block; margin-top: 4px; }
          .content { padding: 32px 24px; }
          h2 { color: #f8fafc; font-size: 20px; margin-top: 0; }
          p { color: #94a3b8; font-size: 15px; line-height: 1.6; margin: 14px 0; }
          .role-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-weight: 600; font-size: 13px; text-transform: uppercase; background: rgba(59, 130, 246, 0.2); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.4); }
          .btn-container { text-align: center; margin: 30px 0; }
          .btn { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: #ffffff !important; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 4px 14px rgba(59, 130, 246, 0.4); }
          .creds-box { background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 16px; margin: 20px 0; }
          .creds-row { margin: 8px 0; font-size: 14px; }
          .creds-label { color: #64748b; font-weight: 500; }
          .creds-val { color: #f1f5f9; font-family: monospace; background: #1e293b; padding: 2px 8px; border-radius: 4px; }
          .footer { background: #0f172a; padding: 20px; text-align: center; border-top: 1px solid #1e293b; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span class="logo-text">CLOUDOPS</span>
            <span class="logo-sub">CI/CD ORCHESTRATOR</span>
          </div>
          <div class="content">
            <h2>Welcome to CloudOps, ${fullName.trim()}! 👋</h2>
            <p><strong>${adminName}</strong> has invited you to join <strong>CloudOps CI/CD Orchestrator</strong>.</p>
            <p>Your assigned role: <span class="role-badge">${assignedRole}</span></p>
            
            <p>Click below to activate your account and choose a new password:</p>
            
            <div class="btn-container">
              <a href="${inviteUrl}" class="btn">Set Password & Activate Account</a>
            </div>

            <p style="font-size: 13px; color: #94a3b8; margin-top: 25px;">You can also sign in directly using temporary credentials:</p>
            <div class="creds-box">
              <div class="creds-row"><span class="creds-label">Login URL: </span> <a href="${loginUrl}" style="color: #60a5fa;">${loginUrl}</a></div>
              <div class="creds-row"><span class="creds-label">Email: </span> <span class="creds-val">${normalizedEmail}</span></div>
              <div class="creds-row"><span class="creds-label">Temporary Password: </span> <span class="creds-val">${tempPassword}</span></div>
            </div>

            <p style="font-size: 12px; color: #64748b; margin-top: 24px;">
              * This invitation link is valid for 7 days. If you did not expect this invitation, you can safely ignore this email.
            </p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} CloudOps Orchestrator. All rights reserved.
          </div>
        </div>
      </body>
      </html>
    `;

    const emailResult = await sendEmail({
      to: normalizedEmail,
      subject: `You've been invited to CloudOps Orchestrator as ${assignedRole.toUpperCase()}`,
      html: emailHtml,
    });

    const emailSent = emailResult.success;
    const emailErrorMessage = emailResult.error || null;

    // Create Audit Log
    try {
      await createAuditLog({
        action: "INVITE_USER",
        user: req.user._id,
        resource: "User",
        resourceId: newUser._id,
        details: `Invited ${normalizedEmail} (${assignedRole}). Email status: ${emailSent ? "Delivered" : "Not delivered (" + emailErrorMessage + ")"}`,
        status: emailSent ? "success" : "warning",
      });
    } catch (auditErr) {
      logger.warn("Failed to create audit log for inviteUser:", auditErr);
    }

    return res.status(201).json({
      success: true,
      message: emailSent
        ? `Invitation email sent successfully to ${normalizedEmail}`
        : `User invited. Email delivery note: ${emailErrorMessage}`,
      emailSent,
      emailError: emailErrorMessage,
      tempPassword,
      inviteUrl,
      user: {
        _id: newUser._id,
        fullName: newUser.fullName,
        email: newUser.email,
        role: newUser.role,
        isVerified: newUser.isVerified,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt,
      },
    });
  } catch (error) {
    logger.error("Error in inviteUser:", error);
    return res.status(500).json({ success: false, message: error.message || "Server error" });
  }
};
