// backend/src/app.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { PrismaClient } = require("@prisma/client");

const authRoutes = require("../routes/auth");
const courseRoutes = require("../routes/courses");
const cloRoutes = require("../routes/clos");
const hodRoutes = require("../routes/hodroutes");
// const facultyAssignmentRoutes = require('../routes/facultyAssignmentRoutes');
const facultyRoutes = require('../routes/facultyRoutes');
const assessmentRoutes = require('../routes/assesmentRoutes');


const prisma = new PrismaClient();
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use((err, req, res, next) => {
  console.error("🔥 ERROR:", err);
  console.error("🔥 Error stack:", err.stack);
  res.status(500).json({ 
    error: "Internal server error",
    message: err.message 
  });
});
app.use((req, res, next) => {
 console.log(`${req.method} ${req.path} - Body:`, req.body || 'N/A');
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/clos", cloRoutes);
console.log("Registering HOD routes");
app.use("/api/hod", hodRoutes);
app.use('/api/assessments', assessmentRoutes);
// app.use('/api/assignments', facultyAssignmentRoutes);
app.use('/api/faculty', facultyRoutes);


const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
