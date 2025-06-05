const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const fs = require("fs");
const session = require("express-session");

const app = express();
const port = 3000;

// Session setup
app.use(session({
  secret: 'spartan_go_secret_key',
  resave: false,
  saveUninitialized: false
}));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(express.static('public'));

// ====== User File Setup ======
const USERS_FILE = path.join(__dirname, 'users.json');

// Ensure users.json exists
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
// ==============================

// Signup route
app.post("/signup", (req, res) => {
  const { name, email, password, terms } = req.body;
  if (!name || !email || !password) {
    return res.status(400).send("Please fill in all required fields.");
  }

  if (!terms) {
    return res.status(400).send("You must agree to the terms and conditions.");
  }

  const users = loadUsers();

  // Check if the email is already registered
  if (users.find(user => user.email === email)) {
    return res.status(409).json({ error: "Signup failed: Email already registered. Please log in instead." });
  }

  users.push({ name, email, password });
  saveUsers(users);

  res.status(200).send("User registered successfully.");
});

// Login route
app.post("/login", (req, res) => {
  const { email, password } = req.body;
  const users = loadUsers();

  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(400).send("Login failed: User not found");
  }

  if (user.password !== password) {
    return res.status(400).send("Login failed: Incorrect password");
  }

  req.session.user = { name: user.name, email: user.email };
  res.send(`Welcome back, ${user.name}! You are logged in.`);
});

// Logout routes
app.post("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).send("Logout failed.");
    res.send("You have been logged out.");
  });
});

app.get("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) return res.status(500).send("Logout failed.");
    res.send("You have been logged out.");
  });
});

// Contact form
app.post("/contact", (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: "Please fill all fields" });
  }

  console.log(`Contact message from ${name} <${email}>: ${message}`);
  res.status(200).json({ message: "Message received" });
});

// Default route - always send to signup (index.html)
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Login page
app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

// Session check
app.get("/check-login", (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});
app.get("/signup", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "signup.html"));
});

// Start server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// Reset password route
app.post("/reset-password", (req, res) => {
  const { email, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ error: "Email and new password are required." });
  }

  const users = loadUsers();
  const user = users.find(u => u.email === email);

  if (!user) {
    return res.status(404).json({ error: "User not found." });
  }

  user.password = newPassword; // Update the user's password
  saveUsers(users);

  res.status(200).json({ message: "Password reset successfully." });
});