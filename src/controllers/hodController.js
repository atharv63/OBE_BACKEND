// controllers/hodController.js

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

exports.getDashboardStats = async (req, res) => {
  try {
    const departmentId = req.user.departmentId;

    if (!departmentId) {
      return res.status(400).json({
        error: "HOD has no department assigned",
      });
    }

    // 1️⃣ Total active courses in department
    const totalCourses = await prisma.course.count({
      where: {
        departmentId,
        isActive: true,
      },
    });

    // 2️⃣ Active CLOs under department courses
    const activeCLOs = await prisma.clo.count({
      where: {
        isActive: true,
        course: {
          departmentId,
        },
      },
    });

    // 3️⃣ Programmes linked to department
    const programmesCount = await prisma.program.count({
      where: {
        departments: {
          some: { id: departmentId },
        },
      },
    });

    // 4️⃣ Program Outcomes (POs) of department’s program
    const programOutcomes = await prisma.po.count({
      where: {
        program: {
          departments: {
            some: { id: departmentId },
          },
        },
      },
    });

    res.json({
      totalCourses,
      activeCLOs,
      programmesCount,
      programOutcomes,
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    res.status(500).json({
      error: error.message,
    });
  }
};

module.exports.getAllCourses = async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      where: {
        departmentId: req.user.departmentId,
      },
      include: {
        createdBy: { select: { name: true } },
        programme: true,
        clos: { where: { isActive: true } },
        assignments: {
          include: {
            faculty: { select: { name: true } },
          },
        },
      },
    });
    res.json(courses);
  } catch (error) {
    console.error("getAllCourses error:", error);
    res.status(500).json({ error: error.message });
  }
};
