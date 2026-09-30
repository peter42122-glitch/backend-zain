require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const crypto = require("crypto");

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(",").map(v => v.trim())
    : true
}));
app.use(express.json({ limit: "1mb" }));

const PORT = process.env.PORT || 4000;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/zainTailor";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "Abdulaziz";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "change-this-password";

const appointmentSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  phone: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  date: { type: String, required: true, trim: true },
  time: { type: String, required: true, trim: true },
  dressType: { type: String, required: true, trim: true },
  message: { type: String, default: "", trim: true },
  status: {
    type: String,
    enum: ["Pending", "Confirmed", "Completed", "Cancelled"],
    default: "Pending"
  }
}, { timestamps: true });

const messageSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, trim: true, lowercase: true },
  subject: { type: String, required: true, trim: true },
  message: { type: String, required: true, trim: true }
}, { timestamps: true });

const Appointment = mongoose.model("Appointment", appointmentSchema);
const CustomerMessage = mongoose.model("CustomerMessage", messageSchema);
const adminTokens = new Set();

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || !adminTokens.has(token)) {
    return res.status(401).json({ success: false, message: "Admin authentication required." });
  }
  next();
}

app.get("/", (req, res) => {
  res.json({ success: true, message: "Zain Tailor backend is running" });
});

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected"
  });
});

app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body || {};
  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return res.status(401).json({ success: false, message: "Invalid username or password." });
  }
  const token = crypto.randomBytes(32).toString("hex");
  adminTokens.add(token);
  res.json({ success: true, token });
});

app.post("/api/admin/logout", requireAdmin, (req, res) => {
  const token = (req.headers.authorization || "").slice(7);
  adminTokens.delete(token);
  res.json({ success: true, message: "Logged out successfully." });
});

app.post("/api/appointments", async (req, res) => {
  try {
    const { name, phone, email, date, time, dressType, message } = req.body || {};
    if (!name || !phone || !email || !date || !time || !dressType) {
      return res.status(400).json({ success: false, message: "Name, phone, email, date, time and dress type are required." });
    }
    if (String(phone).trim().length < 8) {
      return res.status(400).json({ success: false, message: "Please enter a valid phone number." });
    }
    const appointment = await Appointment.create({ name, phone, email, date, time, dressType, message });
    res.status(201).json({ success: true, message: "Your appointment request has been submitted successfully!", data: appointment });
  } catch (e) {
    res.status(500).json({ success: false, message: "Could not save appointment." });
  }
});

app.get("/api/appointments", requireAdmin, async (req, res) => {
  try {
    const appointments = await Appointment.find().sort({ createdAt: -1 });
    res.json({ success: true, data: appointments });
  } catch (e) {
    res.status(500).json({ success: false, message: "Could not load appointments." });
  }
});

app.patch("/api/appointments/:id/status", requireAdmin, async (req, res) => {
  try {
    const { status } = req.body || {};
    const allowed = ["Pending", "Confirmed", "Completed", "Cancelled"];
    if (!allowed.includes(status)) return res.status(400).json({ success: false, message: "Invalid status." });
    const appointment = await Appointment.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
    if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found." });
    res.json({ success: true, message: "Appointment status updated.", data: appointment });
  } catch (e) {
    res.status(400).json({ success: false, message: "Could not update appointment." });
  }
});

app.delete("/api/appointments/:id", requireAdmin, async (req, res) => {
  try {
    const appointment = await Appointment.findByIdAndDelete(req.params.id);
    if (!appointment) return res.status(404).json({ success: false, message: "Appointment not found." });
    res.json({ success: true, message: "Appointment deleted successfully." });
  } catch (e) {
    res.status(400).json({ success: false, message: "Could not delete appointment." });
  }
});

app.delete("/api/appointments", requireAdmin, async (req, res) => {
  try {
    await Appointment.deleteMany({});
    res.json({ success: true, message: "All appointments deleted successfully." });
  } catch (e) {
    res.status(500).json({ success: false, message: "Could not delete appointments." });
  }
});

app.post("/api/messages", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body || {};
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ success: false, message: "Name, email, subject and message are required." });
    }
    const savedMessage = await CustomerMessage.create({ name, email, subject, message });
    res.status(201).json({ success: true, message: "Thank you! Your message has been sent successfully.", data: savedMessage });
  } catch (e) {
    res.status(500).json({ success: false, message: "Could not save message." });
  }
});

app.get("/api/messages", requireAdmin, async (req, res) => {
  try {
    const messages = await CustomerMessage.find().sort({ createdAt: -1 });
    res.json({ success: true, data: messages });
  } catch (e) {
    res.status(500).json({ success: false, message: "Could not load messages." });
  }
});

app.delete("/api/messages/:id", requireAdmin, async (req, res) => {
  try {
    const message = await CustomerMessage.findByIdAndDelete(req.params.id);
    if (!message) return res.status(404).json({ success: false, message: "Message not found." });
    res.json({ success: true, message: "Message deleted successfully." });
  } catch (e) {
    res.status(400).json({ success: false, message: "Could not delete message." });
  }
});

app.delete("/api/messages", requireAdmin, async (req, res) => {
  try {
    await CustomerMessage.deleteMany({});
    res.json({ success: true, message: "All messages deleted successfully." });
  } catch (e) {
    res.status(500).json({ success: false, message: "Could not delete messages." });
  }
});

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`Backend running: http://localhost:${PORT}`));
  } catch (e) {
    console.error("MongoDB connection failed:", e.message);
    process.exit(1);
  }
}

startServer();
