import axios from "axios";
import User from "../models/user.model.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

export const googleLogin = (req, res) => {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `http://localhost:5002/api/v1/auth/google/callback`;
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=profile email&prompt=select_account`;
  res.redirect(url);
};

export const googleCallback = async (req, res) => {
  const { code } = req.query;
  const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

  if (!code) {
    return res.redirect(`${FRONTEND_URL}/login?error=Google_Auth_Failed`);
  }

  try {
    const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `http://localhost:5002/api/v1/auth/google/callback`;

    // Exchange code for token
    const tokenRes = await axios.post("https://oauth2.googleapis.com/token", {
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      code,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    });

    const accessToken = tokenRes.data.access_token;

    // Get user info
    const userRes = await axios.get("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const { id, email, name, picture } = userRes.data;

    let user = await User.findOne({ email });

    if (!user) {
      // Create user if not exists
      const randomPassword = crypto.randomBytes(16).toString("hex");
      user = await User.create({
        fullName: name,
        email,
        password: randomPassword,
        avatar: picture,
        isVerified: true,
      });
    }

    const jwtToken = signToken(user._id);
    res.redirect(`${FRONTEND_URL}/oauth/callback?token=${jwtToken}`);
  } catch (error) {
    console.error("Google Auth Error:", error.response?.data || error.message);
    res.redirect(`${FRONTEND_URL}/login?error=Google_Auth_Failed`);
  }
};

export const githubLogin = (req, res) => {
  const GITHUB_CLIENT_ID = process.env.GITHUB_LOGIN_CLIENT_ID;
  const redirectUri = `http://localhost:5002/api/v1/auth/github/callback`;
  const url = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${redirectUri}&scope=user:email`;
  res.redirect(url);
};

export const githubCallback = async (req, res) => {
  const { code } = req.query;
  const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

  if (!code) {
    return res.redirect(`${FRONTEND_URL}/login?error=Github_Auth_Failed`);
  }

  try {
    const GITHUB_CLIENT_ID = process.env.GITHUB_LOGIN_CLIENT_ID;
    const GITHUB_CLIENT_SECRET = process.env.GITHUB_LOGIN_CLIENT_SECRET;

    const tokenRes = await axios.post(
      "https://github.com/login/oauth/access_token",
      {
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
      },
      { headers: { Accept: "application/json" } }
    );

    const accessToken = tokenRes.data.access_token;

    const userRes = await axios.get("https://api.github.com/user", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    // GitHub emails might be private, so we need to fetch them separately
    const emailRes = await axios.get("https://api.github.com/user/emails", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    const primaryEmailObj = emailRes.data.find(e => e.primary) || emailRes.data[0];
    const email = primaryEmailObj?.email;

    if (!email) {
      return res.redirect(`${FRONTEND_URL}/login?error=Github_No_Email`);
    }

    const { login, name, avatar_url } = userRes.data;

    let user = await User.findOne({ email });

    if (!user) {
      const randomPassword = crypto.randomBytes(16).toString("hex");
      user = await User.create({
        fullName: name || login,
        email,
        password: randomPassword,
        avatar: avatar_url,
        isVerified: true,
      });
    }

    const jwtToken = signToken(user._id);
    res.redirect(`${FRONTEND_URL}/oauth/callback?token=${jwtToken}`);
  } catch (error) {
    console.error("GitHub Auth Error:", error.response?.data || error.message);
    res.redirect(`${FRONTEND_URL}/login?error=Github_Auth_Failed`);
  }
};
