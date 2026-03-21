const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Get all departments for dropdown
module.exports.getDepartmentsForDropdown = async (req, res) => {
  try {
    const departments = await prisma.department.findMany({
      where: {
        isActive: true,
        deletedAt: null
      },
      select: {
        id: true,
        name: true,
        code: true,
        program: {
          select: {
            id: true,
            name: true,
            level: true
          }
        }
      },
      orderBy: [
        { program: { level: 'asc' } },
        { name: 'asc' }
      ]
    });
    
    console.log(`Fetched ${departments.length} departments for dropdown`);
    res.json(departments);
  } catch (error) {
    console.error("getDepartmentsForDropdown error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get department details with faculty count
module.exports.getDepartmentDetails = async (req, res) => {
  try {
    const { departmentId } = req.params;

    const department = await prisma.department.findUnique({
      where: { id: departmentId },
      include: {
        program: {
          select: {
            id: true,
            name: true,
            level: true
          }
        },
        hod: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            faculties: {
              where: { isActive: true }
            },
            courses: {
              where: { isActive: true }
            },
            students: {
              where: { isActive: true }
            }
          }
        }
      }
    });

    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    res.json(department);
  } catch (error) {
    console.error("getDepartmentDetails error:", error);
    res.status(500).json({ error: error.message });
  }
};