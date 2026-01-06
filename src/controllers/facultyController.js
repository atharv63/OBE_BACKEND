// backend/src/controllers/facultyController.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Get faculty profile and assignments
module.exports.getFacultyProfile = async (req, res) => {
  try {
    const faculty = await prisma.faculty.findFirst({
      where: { 
        userId: req.user.id,
        isActive: true 
      },
      include: {
        department: {
          select: { name: true, code: true }
        },
        user: {
          select: { email: true }
        },
        courseAssignments: {
          include: {
            course: {
              select: { 
                code: true, 
                name: true,
                credits: true,
                semester: true,
                type: true
              }
            }
          },
          orderBy: [
            { year: 'desc' },
            { semester: 'asc' }
          ]
        }
      }
    });

    if (!faculty) {
      return res.status(404).json({ error: "Faculty profile not found" });
    }

    res.json(faculty);
  } catch (error) {
    console.error("getFacultyProfile error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get current semester assignments
module.exports.getCurrentAssignments = async (req, res) => {
  try {
    const faculty = await prisma.faculty.findFirst({
      where: { userId: req.user.id }
    });

    if (!faculty) {
      return res.status(404).json({ error: "Faculty not found" });
    }

    // You might want to get current year/semester from academic calendar
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const currentSemester = currentMonth >= 1 && currentMonth <= 6 ? 2 : 1; // Assuming Jan-Jun = Sem2, Jul-Dec = Sem1

    const assignments = await prisma.courseFaculty.findMany({
      where: {
        facultyId: faculty.id,
        year: currentYear,
        semester: currentSemester
      },
      include: {
        course: {
          select: { 
            code: true, 
            name: true,
            credits: true,
            type: true,
            description: true,
            clos: {
              where: { isActive: true },
              select: { code: true, statement: true }
            }
          }
        }
      }
    });

    res.json({
      faculty: {
        name: faculty.name,
        designation: faculty.designation
      },
      currentYear,
      currentSemester,
      assignments
    });
  } catch (error) {
    console.error("getCurrentAssignments error:", error);
    res.status(500).json({ error: error.message });
  }
};