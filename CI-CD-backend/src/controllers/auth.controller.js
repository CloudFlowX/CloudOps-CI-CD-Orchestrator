import crypto from "crypto";
import { sendEmail } from "../utils/emailService.js";
import logger from "../config/logger.js";
import User from "../models/user.model.js";
import generateToken from "../utils/generateToken.js";

// =========================
// Register User
// =========================
export const register = async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;

    // Validate input
    if (!fullName || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Full Name, Email and Password are required",
      });
    }

    // Check existing user
    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "User already exists with this email",
      });
    }

    // Create user
    const user = await User.create({
      fullName,
      email,
      password,
      role,
    });

    // Generate JWT
    const token = generateToken(user._id);

    return res.status(201).json({
      success: true,
      message: "User registered successfully",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        githubUsername: user.githubUsername,
      },
    });
  } catch (error) {
    logger.error("========== REGISTER ERROR ==========");
    logger.error(error);
    logger.error("====================================");

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

// =========================
// Login User
// =========================
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and Password are required",
      });
    }

    // Find user with password
    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid Email or Password",
      });
    }

    // Compare password
    const isPasswordMatch = await user.comparePassword(password);

    if (!isPasswordMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid Email or Password",
      });
    }

    // Generate JWT
    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: "Login Successful",
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        githubUsername: user.githubUsername,
      },
    });
  } catch (error) {
    logger.error("========== LOGIN ERROR ==========");
    logger.error(error);
    logger.error("=================================");

    return res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};
export const getProfile = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: req.user,
  });
};



export const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found with this email" });
    }

    // Generate token
    const resetToken = crypto.randomBytes(24).toString("hex");

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    // Set expire (1 hour)
    user.resetPasswordExpire = Date.now() + 60 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    // Create reset url
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetUrl = `${frontendUrl}/reset-password/${resetToken}`;

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b0f19; color: #e2e8f0; margin: 0; padding: 20px; }
          .container { max-width: 560px; margin: 0 auto; background: #131b2e; border: 1px solid #1e293b; border-radius: 12px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #1e1b4b 0%, #0f172a 100%); padding: 28px; text-align: center; border-bottom: 1px solid #1e293b; }
          .logo-text { font-size: 22px; font-weight: 800; color: #60a5fa; letter-spacing: 1.5px; }
          .logo-sub { font-size: 10px; color: #a855f7; letter-spacing: 3px; display: block; margin-top: 4px; }
          .content { padding: 28px; }
          h2 { color: #f8fafc; font-size: 20px; margin-top: 0; }
          p { color: #94a3b8; font-size: 14px; line-height: 1.6; }
          .btn-container { text-align: center; margin: 28px 0; }
          .btn { background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%); color: #ffffff !important; padding: 13px 26px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block; }
          .link-box { background: #0f172a; border: 1px solid #1e293b; border-radius: 8px; padding: 12px; word-break: break-all; font-family: monospace; font-size: 12px; color: #60a5fa; margin-top: 16px; }
          .footer { background: #0f172a; padding: 18px; text-align: center; border-top: 1px solid #1e293b; font-size: 12px; color: #64748b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <span class="logo-text">CLOUDOPS</span>
            <span class="logo-sub">CI/CD ORCHESTRATOR</span>
          </div>
          <div class="content">
            <h2>Password Reset Request</h2>
            <p>Hello <strong>${user.fullName || "User"}</strong>,</p>
            <p>We received a request to reset your password. Click the button below to choose a new password:</p>
            
            <div class="btn-container">
              <a href="${resetUrl}" class="btn">Reset Password</a>
            </div>

            <p>Or paste this link into your browser:</p>
            <div class="link-box">${resetUrl}</div>

            <p style="font-size: 12px; color: #64748b; margin-top: 24px;">
              * This reset link is valid for 1 hour. If you didn't request a password reset, you can safely ignore this email.
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
      to: user.email,
      subject: "CloudOps Orchestrator - Password Reset Request",
      html: emailHtml,
    });

    if (!emailResult.success) {
      logger.warn(`Password reset email delivery issue for ${user.email}: ${emailResult.error}`);

      // Return 200 with the active resetUrl so the user can immediately reset their password
      // without being blocked by cloud host network policies (e.g. Render blocking SMTP ports)
      return res.status(200).json({
        success: true,
        emailSent: false,
        isSandboxRestriction: emailResult.isSandboxRestriction,
        resetUrl,
        diagnostics: emailResult.diagnostics,
        error: emailResult.error,
        message: emailResult.isSandboxRestriction
          ? "Resend Free Tier test restriction: email only delivers to royalkhurana1@gmail.com. In testing mode, you can use the direct reset link below."
          : `Email delivery issue: ${emailResult.error}. Use direct reset link below.`,
      });
    }

    return res.status(200).json({
      success: true,
      emailSent: true,
      diagnostics: emailResult.diagnostics,
      message: "Password reset link sent to your email",
    });
  } catch (error) {
    logger.error("========== FORGOT PASSWORD ERROR ==========");
    logger.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

export const resetPassword = async (req, res) => {
  try {
    const resetPasswordToken = crypto.createHash("sha256").update(req.params.token).digest("hex");

    const user = await User.findOne({
      resetPasswordToken,
      resetPasswordExpire: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired token" });
    }

    // Set new password
    user.password = req.body.password;
    user.isVerified = true;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successful"
    });
  } catch (error) {
    logger.error("========== RESET PASSWORD ERROR ==========");
    logger.error(error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
