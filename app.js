// backend/src/app.js

require('dotenv').config();

const express = require('express');
const cors = require('cors');

const app = express();

// =======================
// Middleware
// =======================

app.use(cors());
app.use(express.json());

// =======================
// Test Route
// =======================

app.get('/', (req, res) => {
  res.send('✅ OBE Backend Server is running');
});

// =======================
// Start Server
// =======================

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
