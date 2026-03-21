const express = require("express");
const {
  getAllUsers,
  getUsersByCategory,
  getUserDetails,
  toggleUserStatus,
  getUserStats,
  checkUserDependencies
} = require("../controllers/adminUserController");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

// All routes require authentication and ADMIN role
router.use(authenticate);
router.use(authorize('ADMIN'));

// Get users grouped by category (main dashboard view)
router.get("/categories", getUsersByCategory);

// Get user statistics
router.get("/stats", getUserStats);

// Get all users with filters
router.get("/", getAllUsers);

router.get("/:userId/dependencies", checkUserDependencies);

// Get single user details
router.get("/:userId", getUserDetails);

// Toggle user active status
router.patch("/:userId/toggle-status", toggleUserStatus);

module.exports = router;