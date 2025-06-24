const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const session = require("express-session");
const crypto = require("crypto");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
const port = 3000;

const PUBLIC_URL = "https://454cac8e-b261-4165-8fb2-d2be2f076037-00-1wijfywg4wqol.worf.replit.dev";

app.use(session({
  secret: 'spartan_go_secret_key',
  resave: false,
  saveUninitialized: false
}));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));

const USERS_FILE = path.join(__dirname, 'users.json');

if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, '[]', 'utf-8');
}

function loadUsers() {
  try {
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading users.json:", err);
    return [];
  }
}

function saveUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  } catch (err) {
    console.error("Error writing to users.json:", err);
  }
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'maxandsama@gmail.com',
    pass: 'dhqkfvgqgkwixaso'
  }
});

// =====================
// Signup
// =====================
app.post("/signup", (req, res) => {
  const { name, email, password, terms } = req.body;
  const normalizedEmail = email.toLowerCase();

  if (!name || !email || !password) {
    return res.status(400).send("Please fill in all required fields.");
  }
  if (!terms) {
    return res.status(400).send("You must agree to the terms and conditions.");
  }

  const users = loadUsers();
  if (users.find(user => user.email === normalizedEmail)) {
    return res.status(409).send("Account already exists. Please log in.");
  }

  const verificationToken = crypto.randomBytes(32).toString('hex');

  users.push({
    name,
    email: normalizedEmail,
    password,
    isVerified: false,
    verificationToken
  });
  saveUsers(users);

  const mailOptions = {
    from: 'maxandsama@gmail.com',
    to: normalizedEmail,
    subject: 'Verify your email - Designate',
    html: `
      <h2>Welcome to Designate, ${name}!</h2>
      <p>Please verify your email by clicking the link below:</p>
      <a href="${PUBLIC_URL}/verify?token=${verificationToken}">Verify Email</a>
    `
  };

  transporter.sendMail(mailOptions, (err) => {
    if (err) {
      console.error("Error sending email:", err);
      return res.status(500).send("Signup succeeded, but failed to send verification email.");
    }
    res.status(200).send("User registered successfully. Please check your email to verify your account.");
  });
});

app.get("/verify", (req, res) => {
  const { token } = req.query;
  const users = loadUsers();
  const user = users.find(u => u.verificationToken === token);

  if (!user) {
    return res.status(400).send("Invalid or expired verification token.");
  }

  user.isVerified = true;
  user.verificationToken = null;
  saveUsers(users);
  res.send("Your email has been verified. You may now log in.");
});

// =====================
// Login / Logout
// =====================
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const normalizedEmail = email.toLowerCase();

  const users = loadUsers();
  const user = users.find(u => u.email === normalizedEmail);

  if (!user) return res.status(400).send("Login failed: User not found");
  if (!user.isVerified) return res.status(403).send("Login failed: Email not verified. Please check your email.");
  if (user.password !== password) return res.status(400).send("Login failed: Incorrect password");

  req.session.user = { name: user.name, email: user.email };
  res.send(`Welcome back, ${user.name}! You are logged in.`);
});

app.post("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).send("Logout failed.");
    res.send("You have been logged out.");
  });
});

// =====================
// Contact form
// =====================
app.post("/contact", (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: "Please fill all fields" });
  }

  console.log(`Contact message from ${name} <${email}>: ${message}`);
  res.status(200).json({ message: "Message received" });
});

// =====================
// Password Reset
// =====================
app.post("/request-reset-code", (req, res) => {
  const { email } = req.body;
  const normalizedEmail = email.toLowerCase();

  if (!email) return res.status(400).json({ error: "Email is required." });

  const users = loadUsers();
  const user = users.find(u => u.email === normalizedEmail);
  if (!user) return res.status(404).json({ error: "No account found with that email." });

  const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
  user.resetCode = resetCode;
  saveUsers(users);

  const mailOptions = {
    from: 'maxandsama@gmail.com',
    to: normalizedEmail,
    subject: 'Your Designate Password Reset Code',
    html: `<p>Your password reset code is: <strong>${resetCode}</strong></p>`
  };

  transporter.sendMail(mailOptions, (err) => {
    if (err) {
      console.error("Email send error:", err);
      return res.status(500).json({ error: "Failed to send reset code. Please try again." });
    }
    res.status(200).json({ message: "Reset code sent! Check your inbox." });
  });
});

app.post("/reset-password", (req, res) => {
  const { email, resetCode, newPassword, confirmPassword } = req.body;
  const normalizedEmail = email.toLowerCase();

  if (!email || !resetCode || !newPassword || !confirmPassword) {
    return res.status(400).json({ error: "All fields are required." });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ error: "Passwords do not match." });
  }

  const users = loadUsers();
  const user = users.find(u => u.email === normalizedEmail);
  if (!user) return res.status(404).json({ error: "User not found." });
  if (user.resetCode !== resetCode) {
    return res.status(403).json({ error: "Invalid reset code." });
  }

  user.password = newPassword;
  delete user.resetCode;
  saveUsers(users);

  res.status(200).json({ message: "Password has been reset." });
});

// =====================
// Static Routes
// =====================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "signup.html"));
});

app.get("/check-login", (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

// =====================
// Admin Count
// =====================
app.get("/admin/user-count", (req, res) => {
  const adminKey = req.query.key;
  if (adminKey !== process.env.ADMIN_SECRET) {
    return res.status(403).send("Unauthorized access.");
  }

  const users = loadUsers();
  const userCount = users.length;
  res.json({ userCount });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`Server running on http://0.0.0.0:${port}`);
});
