// backend/src/app.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");

const authRoutes = require("../routes/auth");
const courseRoutes = require("../routes/courses");
const cloRoutes = require("../routes/clos");
const hodRoutes = require("../routes/hodroutes");
// Import other routes...

const prisma = new PrismaClient();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(req.method, req.url);
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/clos", cloRoutes);
app.use("/api/hod", hodRoutes);
// Use other routes...

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
