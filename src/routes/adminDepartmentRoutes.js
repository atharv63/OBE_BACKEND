const express = require("express");
const {
  getDepartmentsForDropdown,
  getDepartmentDetails
} = require("../controllers/adminDepartmentController");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

// Debug middleware for this router
router.use((req, res, next) => {
  console.log(`📌 Department Router - Method: ${req.method}, Path: ${req.path}`);
  console.log(`📌 Full URL: ${req.originalUrl}`);
  console.log(`📌 Params:`, req.params);
  next();
});

// All routes require authentication and ADMIN role
router.use(authenticate);
router.use(authorize('ADMIN'));

// IMPORTANT: More specific routes must come FIRST
router.get("/dropdown", (req, res, next) => {
  console.log("🎯 /dropdown route matched!");
  next();
}, getDepartmentsForDropdown);

router.get("/:departmentId", (req, res, next) => {
  console.log("🎯 /:departmentId route matched with ID:", req.params.departmentId);
  next();
}, getDepartmentDetails);

module.exports = router;