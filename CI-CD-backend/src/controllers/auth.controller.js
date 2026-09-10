import crypto from "crypto";
import { Resend } from "resend";

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
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found with this email" });
    }

    // Generate token
    const resetToken = crypto.randomBytes(20).toString("hex");

    // Hash token and set to resetPasswordToken field
    user.resetPasswordToken = crypto.createHash("sha256").update(resetToken).digest("hex");

    // Set expire (10 minutes)
    user.resetPasswordExpire = Date.now() + 10 * 60 * 1000;

    await user.save({ validateBeforeSave: false });

    // Create reset url
    const resetUrl = `http://localhost:5173/reset-password/${resetToken}`;

    const message = `
      <h1>You have requested a password reset</h1>
      <p>Please go to this link to reset your password:</p>
      <a href="${resetUrl}" clicktracking="off">${resetUrl}</a>
    `;

    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: "CloudOps <onboarding@resend.dev>", // default testing email from resend
        to: user.email,
        subject: "Password Reset Token",
        html: message,
      });

      return res.status(200).json({
        success: true,
        message: "Email sent successfully",
      });
    } catch (err) {
      // If email fails, clean up the token
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save({ validateBeforeSave: false });

      logger.error("Email could not be sent:", err);
      return res.status(500).json({ success: false, message: "Email could not be sent" });
    }
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
