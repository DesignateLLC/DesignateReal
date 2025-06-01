const express = require("express");
const bodyParser = require("body-parser");
const path = require("path");
const session = require("express-session");

const app = express();
const port = 3000;
app.use(session({
  secret: 'spartan_go_secret_key',
  resave: false,
  saveUninitialized: false
}));
// Use body-parser middleware for form data
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Serve static files from the "public" folder
app.use(express.static('public'));

// Temporary in-memory user store
const users = [];

// Signup route with logging and terms check
app.post("/signup", (req, res) => {
  console.log("BODY RECEIVED:", req.body);

  const { name, email, password, terms } = req.body;

  if (!name || !email || !password) {
    console.log("Signup failed: missing fields");
    return res.status(400).send("Please fill in all required fields.");
  }

  console.log("Terms value received:", terms);

  if (!terms) {
    console.log("Signup failed: terms not agreed");
    return res.status(400).send("You must agree to the terms and conditions.");
  }

  if (users.find(user => user.email === email)) {
    console.log("Signup failed: email already registered");
    return res.status(400).send("Email already registered");
  }

  users.push({ name, email, password });
  console.log("New user registered:", { name, email });

  res.status(200).send("User registered successfully.");
});

// Login route
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const user = users.find(u => u.email === email);

  if (!user) {
    return res.status(400).send("Login failed: User not found");
  }

  if (user.password !== password) {
    return res.status(400).send("Login failed: Incorrect password");
  }

  // Save user info to session
  req.session.user = { name: user.name, email: user.email };

  res.send(`Welcome back, ${user.name}! You are logged in.`);
});

// Logout route (outside login route)
app.post("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).send("Logout failed.");
    }
    res.send("You have been logged out.");
  });
});
app.get("/logout", (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).send("Logout failed.");
    }
    res.send("You have been logged out.");
  });
});



// Contact form route
app.post("/contact", (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: "Please fill all fields" });
  }

  console.log(`Contact message from ${name} <${email}>: ${message}`);
  res.status(200).json({ message: "Message received" });
});

// Serve homepage
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});
app.get("/check-login", (req, res) => {
  if (req.session.user) {
    res.json({ loggedIn: true, user: req.session.user });
  } else {
    res.json({ loggedIn: false });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
