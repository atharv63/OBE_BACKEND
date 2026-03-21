const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const bcrypt = require('bcryptjs');

// Get all faculty (for admin)
module.exports.getAllFaculty = async (req, res) => {
  try {
    const faculty = await prisma.faculty.findMany({
      where: {
        isActive: true
      },
      include: {
        department: {
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
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            isActive: true
          }
        },
        courseAssignments: {
          include: {
            course: {
              select: {
                id: true,
                name: true,
                code: true,
                semester: true
              }
            }
          },
          take: 5
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
    res.json(faculty);
  } catch (error) {
    console.error("getAllFaculty error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get faculty by department (for admin)
module.exports.getFacultyByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;
    
    const faculty = await prisma.faculty.findMany({
      where: {
        departmentId: departmentId,
        isActive: true
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            isActive: true
          }
        },
        courseAssignments: {
          include: {
            course: {
              select: {
                id: true,
                name: true,
                code: true,
                semester: true
              }
            }
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });
    
    res.json(faculty);
  } catch (error) {
    console.error("getFacultyByDepartment error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Create new faculty (admin only)
module.exports.createFaculty = async (req, res) => {
  try {
    const { 
      name, 
      email, 
      designation, 
      qualifications, 
      departmentId,
      createUserAccount = true,
      password 
    } = req.body;

    // Validate required fields
    if (!name || !email || !departmentId) {
      return res.status(400).json({ error: "Name, email, and department are required" });
    }

    // Check if department exists
    const department = await prisma.department.findUnique({
      where: { id: departmentId }
    });

    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    // Start a transaction
    const result = await prisma.$transaction(async (tx) => {
      let userId = null;
      
      // Create user account if requested
      if (createUserAccount) {
        // Check if email already exists
        const existingUser = await tx.user.findUnique({
          where: { email }
        });

        if (existingUser) {
          throw new Error("User with this email already exists");
        }

        // Hash password (default to email if not provided)
        const hashedPassword = await bcrypt.hash(password || email, 10);

        // Create user
        const user = await tx.user.create({
          data: {
            email,
            password: hashedPassword,
            name,
            role: 'FACULTY',
            departmentId,
            isActive: true
          }
        });
        userId = user.id;
      }

      // Create faculty record
      const faculty = await tx.faculty.create({
        data: {
          name,
          designation,
          qualifications,
          departmentId,
          userId,
          isActive: true
        },
        include: {
          department: {
            select: {
              id: true,
              name: true,
              code: true
            }
          },
          user: {
            select: {
              id: true,
              email: true,
              isActive: true
            }
          }
        }
      });

      return faculty;
    });

    res.status(201).json(result);
  } catch (error) {
    console.error("createFaculty error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Update faculty (admin only)
module.exports.updateFaculty = async (req, res) => {
  try {
    const { facultyId } = req.params;
    const { name, designation, qualifications, departmentId, isActive } = req.body;

    const faculty = await prisma.faculty.update({
      where: { id: facultyId },
      data: {
        name,
        designation,
        qualifications,
        departmentId,
        isActive
      },
      include: {
        department: {
          select: {
            id: true,
            name: true,
            code: true
          }
        }
      }
    });

    // Also update user name if exists
    if (faculty.userId) {
      await prisma.user.update({
        where: { id: faculty.userId },
        data: { 
          name,
          isActive,
          departmentId 
        }
      });
    }

    res.json(faculty);
  } catch (error) {
    console.error("updateFaculty error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Delete faculty (soft delete) - admin only
module.exports.deleteFaculty = async (req, res) => {
  try {
    const { facultyId } = req.params;

    const faculty = await prisma.faculty.update({
      where: { id: facultyId },
      data: { 
        isActive: false,
        deletedAt: new Date()
      }
    });

    // Also deactivate user if exists
    if (faculty.userId) {
      await prisma.user.update({
        where: { id: faculty.userId },
        data: { isActive: false }
      });
    }

    res.json({ message: "Faculty deactivated successfully" });
  } catch (error) {
    console.error("deleteFaculty error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get faculty details with assignments (admin only)
module.exports.getFacultyDetails = async (req, res) => {
  try {
    const { facultyId } = req.params;

    const faculty = await prisma.faculty.findUnique({
      where: { id: facultyId },
      include: {
        department: {
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
          }
        },
        user: {
          select: {
            id: true,
            email: true,
            isActive: true
          }
        },
        courseAssignments: {
          include: {
            course: {
              select: {
                id: true,
                name: true,
                code: true,
                semester: true,
                credits: true,
                type: true
              }
            }
          },
          orderBy: [
            { year: 'desc' },
            { semester: 'asc' }
          ]
        },
        assessments: {
          where: {
            isActive: true
          },
          select: {
            id: true,
            title: true,
            type: true,
            course: {
              select: {
                id: true,
                name: true,
                code: true
              }
            },
            scheduledDate: true
          },
          orderBy: {
            scheduledDate: 'desc'
          },
          take: 10
        }
      }
    });

    if (!faculty) {
      return res.status(404).json({ error: "Faculty not found" });
    }

    res.json(faculty);
  } catch (error) {
    console.error("getFacultyDetails error:", error);
    res.status(500).json({ error: error.message });
  }
};