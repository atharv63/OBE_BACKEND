const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Get all program levels (enum values)
module.exports.getProgramLevels = async (req, res) => {
  try {
    // Return the AcademicLevel enum values
    const levels = ['UG', 'PG', 'DIPLOMA', 'CERTIFICATE'];
    res.json(levels);
  } catch (error) {
    console.error("getProgramLevels error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get programs by level (UG, PG, etc.)
module.exports.getProgramsByLevel = async (req, res) => {
  try {
    const { level } = req.params;
    
    // Validate level
    const validLevels = ['UG', 'PG', 'DIPLOMA', 'CERTIFICATE'];
    if (!validLevels.includes(level)) {
      return res.status(400).json({ error: "Invalid program level" });
    }

    // Get all programs of type LEVEL with the specified academic level
    const programs = await prisma.program.findMany({
      where: {
        type: 'LEVEL',
        level: level,
        isActive: true,
        deletedAt: null
      },
      orderBy: {
        order: 'asc'
      },
      select: {
        id: true,
        name: true,
        code: true,
        slug: true,
        description: true,
        duration: true,
        _count: {
          select: {
            departments: {
              where: {
                isActive: true,
                deletedAt: null
              }
            },
            children: {
              where: {
                isActive: true,
                deletedAt: null
              }
            }
          }
        }
      }
    });

    res.json(programs);
  } catch (error) {
    console.error("getProgramsByLevel error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get departments under a specific program
module.exports.getDepartmentsByProgram = async (req, res) => {
  try {
    const { programId } = req.params;

    // First check if program exists and is active
    const program = await prisma.program.findFirst({
      where: {
        id: programId,
        isActive: true,
        deletedAt: null
      }
    });

    if (!program) {
      return res.status(404).json({ error: "Program not found" });
    }

    // Get all departments under this program
    const departments = await prisma.department.findMany({
      where: {
        programId: programId,
        isActive: true,
        deletedAt: null
      },
      orderBy: {
        order: 'asc'
      },
      include: {
        hod: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            courses: {
              where: {
                isActive: true,
                deletedAt: null
              }
            },
            faculties: {
              where: {
                isActive: true,
                deletedAt: null
              }
            },
            students: {
              where: {
                isActive: true,
                deletedAt: null
              }
            }
          }
        }
      }
    });

    // Add program info to response
    res.json({
      program: {
        id: program.id,
        name: program.name,
        code: program.code,
        level: program.level
      },
      departments
    });
  } catch (error) {
    console.error("getDepartmentsByProgram error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get courses under a specific department
module.exports.getCoursesByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;

    // Check if department exists and is active
    const department = await prisma.department.findFirst({
      where: {
        id: departmentId,
        isActive: true,
        deletedAt: null
      },
      include: {
        program: {
          select: {
            id: true,
            name: true,
            level: true
          }
        }
      }
    });

    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    // Get all courses under this department
    const courses = await prisma.course.findMany({
      where: {
        departmentId: departmentId,
        isActive: true,
        deletedAt: null
      },
      orderBy: [
        { semester: 'asc' },
        { code: 'asc' }
      ],
      include: {
        createdBy: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            clos: {
              where: {
                isActive: true,
                deletedAt: null
              }
            },
            assessments: {
              where: {
                isActive: true
              }
            },
            enrollments: {
              where: {
                status: 'ENROLLED'
              }
            }
          }
        }
      }
    });

    // Group courses by semester
    const coursesBySemester = courses.reduce((acc, course) => {
      const semester = course.semester;
      if (!acc[semester]) {
        acc[semester] = [];
      }
      acc[semester].push(course);
      return acc;
    }, {});

    res.json({
      department: {
        id: department.id,
        name: department.name,
        code: department.code,
        program: department.program
      },
      courses,
      coursesBySemester,
      totalCourses: courses.length
    });
  } catch (error) {
    console.error("getCoursesByDepartment error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get single program details
module.exports.getProgramDetails = async (req, res) => {
  try {
    const { programId } = req.params;

    const program = await prisma.program.findFirst({
      where: {
        id: programId,
        isActive: true,
        deletedAt: null
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            level: true
          }
        },
        children: {
          where: {
            isActive: true,
            deletedAt: null
          },
          select: {
            id: true,
            name: true,
            code: true,
            level: true,
            duration: true
          }
        },
        departments: {
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
                courses: {
                  where: {
                    isActive: true,
                    deletedAt: null
                  }
                },
                faculties: {
                  where: {
                    isActive: true,
                    deletedAt: null
                  }
                },
                students: {
                  where: {
                    isActive: true,
                    deletedAt: null
                  }
                }
              }
            }
          },
          orderBy: {
            order: 'asc'
          }
        },
        _count: {
          select: {
            departments: {
              where: {
                isActive: true,
                deletedAt: null
              }
            },
            students: {
              where: {
                isActive: true,
                deletedAt: null
              }
            }
          }
        }
      }
    });

    if (!program) {
      return res.status(404).json({ error: "Program not found" });
    }

    res.json(program);
  } catch (error) {
    console.error("getProgramDetails error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get single department details
module.exports.getDepartmentDetails = async (req, res) => {
  try {
    const { departmentId } = req.params;

    const department = await prisma.department.findFirst({
      where: {
        id: departmentId,
        isActive: true,
        deletedAt: null
      },
      include: {
        program: {
          select: {
            id: true,
            name: true,
            level: true,
            duration: true
          }
        },
        hod: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        courses: {
          where: {
            isActive: true,
            deletedAt: null
          },
          select: {
            id: true,
            name: true,
            code: true,
            semester: true,
            credits: true,
            type: true,
            category: true,
            _count: {
              select: {
                clos: {
                  where: {
                    isActive: true,
                    deletedAt: null
                  }
                }
              }
            }
          },
          orderBy: [
            { semester: 'asc' },
            { code: 'asc' }
          ]
        },
        faculties: {
          where: {
            isActive: true,
            deletedAt: null
          },
          select: {
            id: true,
            name: true,
            designation: true,
            _count: {
              select: {
                courseAssignments: true
              }
            }
          }
        },
        students: {
          where: {
            isActive: true,
            deletedAt: null
          },
          select: {
            id: true,
            rollNumber: true,
            currentSemester: true,
            admissionYear: true
          },
          take: 10, // Limit to recent 10 students
          orderBy: {
            createdAt: 'desc'
          }
        },
        _count: {
          select: {
            courses: {
              where: {
                isActive: true,
                deletedAt: null
              }
            },
            faculties: {
              where: {
                isActive: true,
                deletedAt: null
              }
            },
            students: {
              where: {
                isActive: true,
                deletedAt: null
              }
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

// Get single course details
module.exports.getCourseDetails = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        isActive: true,
        deletedAt: null
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
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        clos: {
          where: {
            isActive: true,
            deletedAt: null
          },
          orderBy: {
            order: 'asc'
          },
          include: {
            poMappings: {
              include: {
                po: true
              }
            },
            psoMappings: {
              include: {
                pso: true
              }
            },
            _count: {
              select: {
                marks: true,
                assessmentClos: true
              }
            }
          }
        },
        assessments: {
          where: {
            isActive: true
          },
          orderBy: {
            scheduledDate: 'desc'
          },
          include: {
            faculty: {
              select: {
                id: true,
                name: true
              }
            },
            _count: {
              select: {
                marks: true,
                assessmentClos: true
              }
            }
          }
        },
        facultyAssignments: {
          where: {
            courseId: courseId
          },
          include: {
            faculty: {
              select: {
                id: true,
                name: true,
                designation: true
              }
            }
          },
          orderBy: [
            { year: 'desc' },
            { semester: 'asc' }
          ]
        },
        enrollments: {
          where: {
            status: 'ENROLLED'
          },
          include: {
            student: {
              select: {
                id: true,
                rollNumber: true
              }
            }
          },
          take: 10
        },
        _count: {
          select: {
            clos: {
              where: {
                isActive: true,
                deletedAt: null
              }
            },
            assessments: {
              where: {
                isActive: true
              }
            },
            enrollments: {
              where: {
                status: 'ENROLLED'
              }
            },
            facultyAssignments: true
          }
        }
      }
    });

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    res.json(course);
  } catch (error) {
    console.error("getCourseDetails error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get program types with counts (for dashboard)
// Get program types with counts (for dashboard)
module.exports.getProgramTypesWithCounts = async (req, res) => {
  try {
    // Get counts for DEGREE programs by level (not LEVEL type programs)
    const [ugCount, pgCount, diplomaCount, certificateCount] = await Promise.all([
      // Count UG degree programs
      prisma.program.count({
        where: { 
          type: 'DEGREE',  // Count DEGREE type, not LEVEL
          level: 'UG',
          isActive: true,
          deletedAt: null
        }
      }),
      // Count PG degree programs
      prisma.program.count({
        where: { 
          type: 'DEGREE',
          level: 'PG',
          isActive: true,
          deletedAt: null
        }
      }),
      // Count DIPLOMA programs
      prisma.program.count({
        where: { 
          type: 'DEGREE',
          level: 'DIPLOMA',
          isActive: true,
          deletedAt: null
        }
      }),
      // Count CERTIFICATE programs
      prisma.program.count({
        where: { 
          type: 'DEGREE',
          level: 'CERTIFICATE',
          isActive: true,
          deletedAt: null
        }
      })
    ]);

    // Get total counts for dashboard
    const [totalPrograms, totalDepartments, totalCourses] = await Promise.all([
      // Count all ACTIVE degree programs (not level containers)
      prisma.program.count({
        where: { 
          type: 'DEGREE',  // Only count actual degree programs
          isActive: true,
          deletedAt: null
        }
      }),
      prisma.department.count({
        where: { 
          isActive: true,
          deletedAt: null
        }
      }),
      prisma.course.count({
        where: { 
          isActive: true,
          deletedAt: null
        }
      })
    ]);

    res.json({
      programTypes: [
        { level: 'UG', count: ugCount, label: 'Undergraduate', icon: '🎓' },
        { level: 'PG', count: pgCount, label: 'Postgraduate', icon: '📚' },
        { level: 'DIPLOMA', count: diplomaCount, label: 'Diploma', icon: '📜' },
        { level: 'CERTIFICATE', count: certificateCount, label: 'Certificate', icon: '📄' }
      ],
      totalStats: {
        programs: totalPrograms,
        departments: totalDepartments,
        courses: totalCourses
      }
    });
  } catch (error) {
    console.error("getProgramTypesWithCounts error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Update getProgramsByLevel to include more details
// Get programs by level (UG, PG, etc.)
module.exports.getProgramsByLevel = async (req, res) => {
  try {
    const { level } = req.params;
    
    const validLevels = ['UG', 'PG', 'DIPLOMA', 'CERTIFICATE'];
    if (!validLevels.includes(level)) {
      return res.status(400).json({ error: "Invalid program level" });
    }

    // Get the LEVEL type program info (like "Undergraduate")
    const levelProgram = await prisma.program.findFirst({
      where: {
        type: 'LEVEL',
        level: level,
        isActive: true,
        deletedAt: null
      }
    });

    // Get all DEGREE type programs under this level
    const degreePrograms = await prisma.program.findMany({
      where: {
        type: 'DEGREE',
        level: level,
        isActive: true,
        deletedAt: null
      },
      orderBy: {
        order: 'asc'
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true
          }
        },
        departments: {
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
                courses: {
                  where: {
                    isActive: true,
                    deletedAt: null
                  }
                },
                faculties: {
                  where: {
                    isActive: true,
                    deletedAt: null
                  }
                },
                students: {
                  where: {
                    isActive: true,
                    deletedAt: null
                  }
                }
              }
            }
          }
        },
        _count: {
          select: {
            departments: {
              where: {
                isActive: true,
                deletedAt: null
              }
            },
            students: {
              where: {
                isActive: true,
                deletedAt: null
              }
            }
          }
        }
      }
    });

    res.json({
      level: level,
      levelInfo: levelProgram,
      programs: degreePrograms
    });
  } catch (error) {
    console.error("getProgramsByLevel error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Update getDepartmentsByProgram to include more hierarchical info
module.exports.getDepartmentsByProgram = async (req, res) => {
  try {
    const { programId } = req.params;

    const program = await prisma.program.findFirst({
      where: {
        id: programId,
        isActive: true,
        deletedAt: null
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            level: true
          }
        }
      }
    });

    if (!program) {
      return res.status(404).json({ error: "Program not found" });
    }

    const departments = await prisma.department.findMany({
      where: {
        programId: programId,
        isActive: true,
        deletedAt: null
      },
      orderBy: {
        order: 'asc'
      },
      include: {
        hod: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        _count: {
          select: {
            courses: {
              where: {
                isActive: true,
                deletedAt: null
              }
            },
            faculties: {
              where: {
                isActive: true,
                deletedAt: null
              }
            },
            students: {
              where: {
                isActive: true,
                deletedAt: null
              }
            }
          }
        }
      }
    });

    // Get breadcrumb info
    const breadcrumb = [
      { level: 'Home', path: '/admin' },
      { level: program.parent?.level || program.level, path: `/admin/programs/level/${program.parent?.level || program.level}` },
      { level: program.parent?.name, path: program.parent ? `/admin/programs/${program.parent.id}` : null },
      { level: program.name, path: `/admin/programs/${program.id}` }
    ].filter(item => item.level); // Remove null/undefined

    res.json({
      breadcrumb,
      program: {
        id: program.id,
        name: program.name,
        code: program.code,
        level: program.level,
        parent: program.parent
      },
      departments,
      totalDepartments: departments.length,
      summary: {
        totalCourses: departments.reduce((acc, dept) => acc + dept._count.courses, 0),
        totalFaculties: departments.reduce((acc, dept) => acc + dept._count.faculties, 0),
        totalStudents: departments.reduce((acc, dept) => acc + dept._count.students, 0)
      }
    });
  } catch (error) {
    console.error("getDepartmentsByProgram error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Update getCoursesByDepartment to include better grouping
module.exports.getCoursesByDepartment = async (req, res) => {
  try {
    const { departmentId } = req.params;

    const department = await prisma.department.findFirst({
      where: {
        id: departmentId,
        isActive: true,
        deletedAt: null
      },
      include: {
        program: {
          include: {
            parent: {
              select: {
                id: true,
                name: true,
                level: true
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
      }
    });

    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    const courses = await prisma.course.findMany({
      where: {
        departmentId: departmentId,
        isActive: true,
        deletedAt: null
      },
      orderBy: [
        { semester: 'asc' },
        { code: 'asc' }
      ],
      include: {
        createdBy: {
          select: {
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            clos: {
              where: {
                isActive: true,
                deletedAt: null
              }
            },
            assessments: {
              where: {
                isActive: true
              }
            },
            enrollments: {
              where: {
                status: 'ENROLLED'
              }
            },
            facultyAssignments: true
          }
        }
      }
    });

    // Group courses by semester with statistics
    const coursesBySemester = courses.reduce((acc, course) => {
      const semester = course.semester;
      if (!acc[semester]) {
        acc[semester] = {
          semester,
          courses: [],
          totalCredits: 0,
          totalCLOs: 0
        };
      }
      acc[semester].courses.push(course);
      acc[semester].totalCredits += course.credits || 0;
      acc[semester].totalCLOs += course._count.clos;
      return acc;
    }, {});

    // Convert to array and sort by semester
    const semesters = Object.values(coursesBySemester).sort((a, b) => a.semester - b.semester);

    // Create breadcrumb
    const breadcrumb = [
      { level: 'Home', path: '/admin' },
      { level: department.program.parent?.level || department.program.level, 
        path: `/admin/programs/level/${department.program.parent?.level || department.program.level}` },
      { level: department.program.parent?.name, 
        path: department.program.parent ? `/admin/programs/${department.program.parent.id}` : null },
      { level: department.program.name, 
        path: `/admin/programs/${department.program.id}` },
      { level: department.name, 
        path: `/admin/departments/${department.id}` }
    ].filter(item => item.level);

    res.json({
      breadcrumb,
      department: {
        id: department.id,
        name: department.name,
        code: department.code,
        hod: department.hod,
        program: {
          id: department.program.id,
          name: department.program.name,
          level: department.program.level,
          parent: department.program.parent
        }
      },
      semesters,
      summary: {
        totalCourses: courses.length,
        totalCredits: courses.reduce((acc, c) => acc + (c.credits || 0), 0),
        totalCLOs: courses.reduce((acc, c) => acc + c._count.clos, 0),
        totalAssessments: courses.reduce((acc, c) => acc + c._count.assessments, 0),
        totalEnrollments: courses.reduce((acc, c) => acc + c._count.enrollments, 0)
      }
    });
  } catch (error) {
    console.error("getCoursesByDepartment error:", error);
    res.status(500).json({ error: error.message });
  }
};