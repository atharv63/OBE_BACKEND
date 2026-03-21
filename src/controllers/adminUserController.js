const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Get all users with filters and counts
module.exports.getAllUsers = async (req, res) => {
  try {
    const { role, departmentId, search, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build where clause
    const where = {
      isActive: true
      // Removed deletedAt
    };

    if (role) {
      where.role = role;
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { email: { contains: search } }
      ];
    }

    // Get users with pagination
    const [users, totalCount] = await Promise.all([
      prisma.user.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: {
          createdAt: 'desc'
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
          faculty: {
            select: {
              id: true,
              designation: true,
              qualifications: true
            }
          },
          student: {
            select: {
              id: true,
              rollNumber: true,
              currentSemester: true,
              admissionYear: true
            }
          },
          hodDepartments: {
            select: {
              id: true,
              name: true,
              code: true
            }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    res.json({
      users,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        totalCount,
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });
  } catch (error) {
    console.error("getAllUsers error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get users grouped by role and department
module.exports.getUsersByCategory = async (req, res) => {
  try {
    // Get all departments with their users (including inactive)
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
        },
        hod: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true
          }
        },
        users: {
          // Shows ALL users (active and inactive)
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            isActive: true,
            createdAt: true,
            faculty: {
              select: {
                id: true,
                designation: true
              }
            },
            student: {
              select: {
                id: true,
                rollNumber: true,
                currentSemester: true,
                admissionYear: true
              }
            }
          },
          orderBy: {
            name: 'asc'
          }
        }
      },
      orderBy: [
        { program: { level: 'asc' } },
        { name: 'asc' }
      ]
    });

    // Also get users without department (including inactive)
    const usersWithoutDept = await prisma.user.findMany({
      where: {
        departmentId: null
        // Shows ALL users without department (active and inactive)
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Initialize response structure
    const response = {
      summary: {
        totalUsers: 0,
        totalAdmins: 0,
        totalHODs: 0,
        totalFaculty: 0,
        totalStudents: 0,
        totalDepartments: departments.length
      },
      usersByRole: {
        ADMIN: [],
        HOD: [],
        FACULTY: [],
        STUDENT: []
      },
      usersByDepartment: [],
      admins: usersWithoutDept.filter(u => u.role === 'ADMIN'),
      unassigned: usersWithoutDept.filter(u => u.role !== 'ADMIN')
    };

    // Process each department
    departments.forEach(dept => {
      const deptData = {
        department: {
          id: dept.id,
          name: dept.name,
          code: dept.code,
          program: dept.program
        },
        hod: dept.hod,
        counts: {
          total: dept.users.length,
          faculty: 0,
          students: 0
        },
        faculty: [],
        students: []
      };

      // Categorize users in this department
      dept.users.forEach(user => {
        if (user.role === 'FACULTY') {
          deptData.counts.faculty++;
          deptData.faculty.push(user);
          // Add department info when pushing to usersByRole.FACULTY
          response.usersByRole.FACULTY.push({
            ...user,
            department: {  // Add department information
              id: dept.id,
              name: dept.name,
              code: dept.code
            }
          });
        } else if (user.role === 'STUDENT') {
          deptData.counts.students++;
          deptData.students.push(user);
          // Add department info when pushing to usersByRole.STUDENT
          response.usersByRole.STUDENT.push({
            ...user,
            department: {  // Add department information
              id: dept.id,
              name: dept.name,
              code: dept.code
            }
          });
        }
      });

      // Add HOD to usersByRole.HOD if exists
      if (dept.hod) {
        response.usersByRole.HOD.push({
          ...dept.hod,
          department: { id: dept.id, name: dept.name, code: dept.code }
        });
      }

      response.usersByDepartment.push(deptData);
    });

    // Calculate totals
    response.summary.totalAdmins = response.admins.length;
    response.summary.totalHODs = response.usersByRole.HOD.length;
    response.summary.totalFaculty = response.usersByRole.FACULTY.length;
    response.summary.totalStudents = response.usersByRole.STUDENT.length;
    response.summary.totalUsers = 
      response.summary.totalAdmins + 
      response.summary.totalHODs + 
      response.summary.totalFaculty + 
      response.summary.totalStudents;

    // Add admins to usersByRole.ADMIN
    response.usersByRole.ADMIN = response.admins;

    console.log("getUsersByCategory - Response prepared successfully");
    console.log(`Total Users: ${response.summary.totalUsers}`);
    console.log(`Admins: ${response.summary.totalAdmins}`);
    console.log(`HODs: ${response.summary.totalHODs}`);
    console.log(`Faculty: ${response.summary.totalFaculty}`);
    console.log(`Students: ${response.summary.totalStudents}`);
    
    res.json(response);
  } catch (error) {
    console.error("getUsersByCategory error:", error);
    res.status(500).json({ error: error.message });
  }
};
// Get single user details
module.exports.getUserDetails = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        isActive: true
        // Removed deletedAt
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
        faculty: {
          include: {
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
            },
            assessments: {
              where: {
                isActive: true
              },
              take: 5,
              orderBy: {
                createdAt: 'desc'
              }
            }
          }
        },
        student: {
          include: {
            program: {
              select: {
                id: true,
                name: true,
                level: true
              }
            },
            enrollments: {
              include: {
                course: {
                  select: {
                    id: true,
                    name: true,
                    code: true,
                    semester: true,
                    credits: true
                  }
                }
              },
              orderBy: [
                { year: 'desc' },
                { semester: 'desc' }
              ]
            },
            marks: {
              take: 10,
              orderBy: {
                createdAt: 'desc'
              },
              include: {
                assessment: {
                  select: {
                    id: true,
                    title: true,
                    type: true
                  }
                },
                clo: {
                  select: {
                    id: true,
                    code: true,
                    bloomLevel: true
                  }
                }
              }
            }
          }
        },
        hodDepartments: {
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        createdCourses: {
          take: 5,
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        createdClos: {
          take: 5,
          select: {
            id: true,
            code: true,
            statement: true
          }
        },
        enteredMarks: {
          take: 5,
          orderBy: {
            enteredAt: 'desc'
          },
          include: {
            student: {
              select: {
                id: true,
                rollNumber: true
              }
            },
            assessment: {
              select: {
                id: true,
                title: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(user);
  } catch (error) {
    console.error("getUserDetails error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Toggle user active status
module.exports.toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { isActive },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true
      }
    });

    res.json(user);
  } catch (error) {
    console.error("toggleUserStatus error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get department-wise statistics
module.exports.getUserStats = async (req, res) => {
  try {
    const stats = await prisma.department.findMany({
      where: {
        isActive: true,
        deletedAt: null
      },
      select: {
        id: true,
        name: true,
        code: true,
        _count: {
          select: {
            users: {
              where: {
                isActive: true
                // Removed deletedAt
              }
            },
            faculties: {
              where: {
                isActive: true
                // Removed deletedAt
              }
            },
            students: {
              where: {
                isActive: true
                // Removed deletedAt
              }
            }
          }
        },
        hod: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    // Get overall stats
    const overall = await prisma.user.groupBy({
      by: ['role'],
      where: {
        isActive: true
        // Removed deletedAt
      },
      _count: true
    });

    const roleStats = {};
    overall.forEach(item => {
      roleStats[item.role] = item._count;
    });

    res.json({
      departments: stats,
      overall: {
        totalUsers: stats.reduce((acc, dept) => acc + dept._count.users, 0),
        ...roleStats
      }
    });
  } catch (error) {
    console.error("getUserStats error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Check user dependencies before deactivation
module.exports.checkUserDependencies = async (req, res) => {
  try {
    const { userId } = req.params;
    console.log("Checking dependencies for user:", userId);
    console.log("Request headers:", req.headers.authorization ? "Auth header present" : "No auth header");

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        department: true,
        faculty: {
          include: {
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
            },
            assessments: {
              where: {
                isActive: true
              },
              select: {
                id: true,
                title: true,
                course: {
                  select: {
                    id: true,
                    name: true,
                    code: true
                  }
                }
              }
            },
            finalizedAssessments: {
              select: {
                id: true,
                title: true
              }
            }
          }
        },
        student: {
          include: {
            enrollments: {
              where: {
                status: 'ENROLLED'
              },
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
            },
            marks: {
              take: 5,
              select: {
                // Mark doesn't have an 'id' field, use the composite key fields
                studentId: true,
                assessmentId: true,
                cloId: true,
                marksObtained: true,
                assessment: {
                  select: {
                    id: true,
                    title: true
                  }
                },
                clo: {
                  select: {
                    id: true,
                    code: true
                  }
                }
              }
            }
          }
        },
        hodDepartments: {
          where: {
            isActive: true
          },
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        createdCourses: {
          where: {
            isActive: true
          },
          select: {
            id: true,
            name: true,
            code: true
          }
        },
        createdClos: {
          where: {
            isActive: true
          },
          select: {
            id: true,
            code: true,
            course: {
              select: {
                id: true,
                name: true,
                code: true
              }
            }
          }
        },
        enteredMarks: {
          take: 5,
          select: {
            // Mark doesn't have an 'id' field
            studentId: true,
            assessmentId: true,
            cloId: true,
            marksObtained: true,
            assessment: {
              select: {
                id: true,
                title: true
              }
            },
            student: {
              select: {
                id: true,
                rollNumber: true
              }
            },
            clo: {
              select: {
                id: true,
                code: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      console.log("User not found:", userId);
      return res.status(404).json({ error: "User not found" });
    }

    console.log("User found:", user.id, user.name);

    // Compile dependencies
    const dependencies = {
      hasActiveRelations: false,
      hodOfDepartments: [],
      facultyAssignments: [],
      activeAssessments: [],
      studentEnrollments: [],
      createdCourses: [],
      createdClos: [],
      hasEnteredMarks: (user.enteredMarks?.length || 0) > 0,
      warning: null
    };

    // Check HOD dependencies
    if (user.hodDepartments?.length > 0) {
      dependencies.hodOfDepartments = user.hodDepartments;
      dependencies.hasActiveRelations = true;
    }

    // Check faculty dependencies
    if (user.faculty) {
      if (user.faculty.courseAssignments?.length > 0) {
        dependencies.facultyAssignments = user.faculty.courseAssignments;
        dependencies.hasActiveRelations = true;
      }
      if (user.faculty.assessments?.length > 0) {
        dependencies.activeAssessments = user.faculty.assessments;
        dependencies.hasActiveRelations = true;
      }
    }

    // Check student dependencies
    if (user.student) {
      if (user.student.enrollments?.length > 0) {
        dependencies.studentEnrollments = user.student.enrollments;
        dependencies.hasActiveRelations = true;
      }
    }

    // Check created courses
    if (user.createdCourses?.length > 0) {
      dependencies.createdCourses = user.createdCourses;
      dependencies.hasActiveRelations = true;
    }

    // Check created CLOs
    if (user.createdClos?.length > 0) {
      dependencies.createdClos = user.createdClos;
      dependencies.hasActiveRelations = true;
    }

    // Generate warning message
    if (dependencies.hasActiveRelations) {
      let warning = "This user has active associations that will be affected:\n";
      
      if (dependencies.hodOfDepartments.length > 0) {
        warning += `\n• Head of Department for: ${dependencies.hodOfDepartments.map(d => d.name).join(', ')}`;
      }
      
      if (dependencies.facultyAssignments.length > 0) {
        warning += `\n• Teaching ${dependencies.facultyAssignments.length} course(s)`;
        // Add first few course names
        const courseNames = dependencies.facultyAssignments.slice(0, 3).map(a => a.course?.name).filter(Boolean);
        if (courseNames.length > 0) {
          warning += ` (${courseNames.join(', ')}${dependencies.facultyAssignments.length > 3 ? '...' : ''})`;
        }
      }
      
      if (dependencies.activeAssessments.length > 0) {
        warning += `\n• Has ${dependencies.activeAssessments.length} active assessment(s)`;
      }
      
      if (dependencies.studentEnrollments.length > 0) {
        warning += `\n• Enrolled in ${dependencies.studentEnrollments.length} course(s)`;
      }
      
      if (dependencies.createdCourses.length > 0) {
        warning += `\n• Created ${dependencies.createdCourses.length} course(s)`;
      }
      
      if (dependencies.createdClos.length > 0) {
        warning += `\n• Created ${dependencies.createdClos.length} CLO(s)`;
      }
      
      if (dependencies.hasEnteredMarks) {
        warning += `\n• Has entered marks for students`;
      }
      
      dependencies.warning = warning;
    }

    console.log("Dependencies found:", dependencies.hasActiveRelations);
    res.json(dependencies);
  } catch (error) {
    console.error("checkUserDependencies error:", error);
    res.status(500).json({ error: error.message });
  }
};
// Toggle user active status with dependency check
module.exports.toggleUserStatus = async (req, res) => {
  try {
    const { userId } = req.params;
    const { isActive, force = false } = req.body;

    // If trying to deactivate, check dependencies
    if (!isActive && !force) {
      // First check if user has any active dependencies
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: {
          hodDepartments: {
            where: { isActive: true }
          },
          faculty: {
            include: {
              courseAssignments: true,
              assessments: {
                where: { isActive: true }
              }
            }
          },
          student: {
            include: {
              enrollments: {
                where: { status: 'ENROLLED' }
              }
            }
          },
          createdCourses: {
            where: { isActive: true }
          },
          createdClos: {
            where: { isActive: true }
          }
        }
      });

      const hasDependencies = 
        user.hodDepartments.length > 0 ||
        (user.faculty && (
          user.faculty.courseAssignments.length > 0 ||
          user.faculty.assessments.length > 0
        )) ||
        (user.student && user.student.enrollments.length > 0) ||
        user.createdCourses.length > 0 ||
        user.createdClos.length > 0;

      if (hasDependencies) {
        return res.status(409).json({ 
          error: "User has active dependencies",
          requiresForce: true,
          message: "This user has active course/faculty/student relationships. Please reassign or remove these dependencies first, or use force deactivation."
        });
      }
    }

    // If force deactivation, we need to handle the dependencies
    if (!isActive && force) {
      // Use a transaction to handle all updates
      await prisma.$transaction(async (tx) => {
        // Get user details
        const user = await tx.user.findUnique({
          where: { id: userId },
          include: {
            faculty: true,
            student: true
          }
        });

        // If user is HOD, remove HOD status from departments
        await tx.department.updateMany({
          where: { hodId: userId },
          data: { hodId: null }
        });

        // If user is faculty, handle faculty records
        if (user.faculty) {
          // Update or delete faculty record based on your business logic
          await tx.faculty.update({
            where: { id: user.faculty.id },
            data: { isActive: false }
          });
        }

        // If user is student, handle student records
        if (user.student) {
          await tx.student.update({
            where: { id: user.student.id },
            data: { isActive: false }
          });
        }

        // Finally, deactivate the user
        await tx.user.update({
          where: { id: userId },
          data: { isActive: false }
        });
      });
    } else {
      // Simple toggle (activating or deactivating with no dependencies)
      const user = await prisma.user.update({
        where: { id: userId },
        data: { isActive },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          isActive: true
        }
      });
      
      return res.json(user);
    }

    res.json({ success: true, message: "User deactivated successfully" });
  } catch (error) {
    console.error("toggleUserStatus error:", error);
    res.status(500).json({ error: error.message });
  }
};