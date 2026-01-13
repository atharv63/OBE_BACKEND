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

exports.getAllCourses = async (req, res) => {
  try {
    const userId = req.user.id;
    const { programId } = req.query;

    // Find departments the HOD can access (either explicitly assigned or via their departmentId)
    const departments = await prisma.department.findMany({
      where: {
        OR: [{ hodId: userId }, { id: req.user.departmentId }],
      },
      select: { id: true, programId: true },
    });

    if (!departments || departments.length === 0) {
      return res.status(400).json({ error: "HOD has no departments assigned" });
    }

    // If programId provided, restrict to departments that belong to that program
    let allowedDeptIds = departments.map((d) => d.id);
    if (programId) {
      const filtered = departments.filter((d) => d.programId === programId);
      if (filtered.length === 0) {
        // No departments for selected program — return empty list
        return res.json([]);
      }
      allowedDeptIds = filtered.map((d) => d.id);
    }

    const courses = await prisma.course.findMany({
      where: {
        departmentId: { in: allowedDeptIds },
      },
      include: {
        createdBy: { select: { id: true, name: true, email: true } },
        department: {
          include: {
            program: { select: { id: true, name: true, slug: true } },
          },
        },
        clos: { where: { isActive: true } },
        // ADD THIS to include faculty assignments:
        facultyAssignments: {
          include: {
            faculty: {
              select: {
                id: true,
                name: true,
                designation: true,
              },
            },
          },
        },
      },
      orderBy: [{ semester: "asc" }, { createdAt: "desc" }],
    });

    res.json(courses);
  } catch (error) {
    console.error("getAllCourses error:", error);
    res.status(500).json({ error: error.message });
  }
};
// GET programs for the logged in user's department(s)
module.exports.getPrograms = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // 1️⃣ Get departments where user belongs (or is HOD)
    const departments = await prisma.department.findMany({
      where: {
        OR: [
          { users: { some: { id: userId } } }, // faculty/student
          { hodId: userId }, // HOD
        ],
      },
      select: {
        program: true, // include full program
      },
    });

    // 2️⃣ Extract unique programs
    const programs = Array.from(
      new Map(departments.map((d) => [d.program.id, d.program])).values()
    );

    return res.json(programs);
  } catch (err) {
    console.error("getMyPrograms error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

//Get auoto code for course
module.exports.getAutoCode = async (req, res) => {
  async (req, res) => {
    const { programmeId } = req.params;

    const last = await prisma.course.findFirst({
      where: { department: { programId: programmeId } },
      orderBy: { createdAt: "desc" },
      select: { code: true },
    });

    let next = "C001";
    if (last?.code) {
      const n = parseInt(last.code.replace(/\D/g, "")) + 1;
      next = `C${String(n).padStart(3, "0")}`;
    }

    res.json({ code: next });
  };
};

//Create a course
exports.createCourse = async (req, res) => {
  console.log("USER:", req.user);
  console.log("DEPT:", req.user?.departmentId);

  try {
    const {
      code,
      name,
      slug,
      semester,
      credits,
      type,
      category,
      description,
      isActive,
    } = req.body;

    const departmentId = req.user.departmentId;

    if (!departmentId) {
      return res.status(403).json({
        error: "You do not belong to any department",
      });
    }

    // Ensure user is the HOD of this dept
    const dept = await prisma.department.findFirst({
      where: { hodId: req.user.id, id: departmentId },
      select: { id: true },
    });

    console.log("DEPT CHECK:", dept);

    if (!dept) {
      return res.status(403).json({
        error: "You are not authorized to create a course for this department",
      });
    }

    if (!code || !name) {
      return res.status(400).json({ error: "code and name are required" });
    }

    // Simple slug generation if not provided
    const makeSlug = (text) =>
      text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9 -]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");

    const finalSlug = slug || makeSlug(name);

    // Validate enums
    const validCategories = ["MAD", "VAC", "SEC", "CORE", "VOCATIONAL"];
    if (category && !validCategories.includes(category)) {
      return res.status(400).json({ error: "Invalid category" });
    }

    const validTypes = ["THEORY", "PRACTICAL", "BOTH"];
    if (type && !validTypes.includes(type)) {
      return res.status(400).json({ error: "Invalid type" });
    }

    const course = await prisma.course.create({
      data: {
        code,
        name,
        slug: finalSlug,
        semester: semester ? parseInt(semester) : 0,
        credits: credits ? parseInt(credits) : null,
        type,
        category,
        description,
        isActive: typeof isActive === "boolean" ? isActive : true,
        departmentId,
        createdById: req.user.id,
      },
    });

    res.status(201).json(course);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({
        error:
          "A course with that slug/code already exists for this department/semester",
      });
    }

    console.error("createCourse error:", error);
    res.status(400).json({ error: error.message });
  }
};

//Update course
exports.updateCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const {
      code,
      name,
      slug,
      semester,
      credits,
      type,
      category,
      description,
      isActive,
    } = req.body;

    // Find existing course
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Verify user is HOD of the course's department
    const isHod = await prisma.department.findFirst({
      where: { id: course.departmentId, hodId: req.user.id },
    });

    if (!isHod) {
      return res
        .status(403)
        .json({ error: "You are not authorized to update this course" });
    }

    // Simple slug generator (same as createCourse)
    const makeSlug = (text) =>
      text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9 -]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");

    const data = {};

    if (code) data.code = code;
    if (name) data.name = name;
    if (typeof slug !== "undefined")
      data.slug = slug || (name ? makeSlug(name) : undefined);
    if (typeof semester !== "undefined")
      data.semester = semester !== null ? parseInt(semester) : null;
    if (typeof credits !== "undefined")
      data.credits = credits !== null ? parseInt(credits) : null;
    if (type) data.type = type;
    if (category) data.category = category;
    if (typeof description !== "undefined") data.description = description;
    if (typeof isActive !== "undefined") data.isActive = isActive;

    data.updatedAt = new Date();

    // Validate enums
    const validCategories = ["MAD", "VAC", "SEC", "CORE", "VOCATIONAL"];
    if (data.category && !validCategories.includes(data.category)) {
      return res.status(400).json({ error: "Invalid category" });
    }

    const validTypes = ["THEORY", "PRACTICAL", "BOTH"];
    if (data.type && !validTypes.includes(data.type)) {
      return res.status(400).json({ error: "Invalid type" });
    }

    const updated = await prisma.course.update({
      where: { id: courseId },
      data,
    });

    res.json(updated);
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(400).json({
        error:
          "A course with that slug/code already exists for this department/semester",
      });
    }

    console.error("updateCourse error:", error);
    res.status(500).json({ error: error.message });
  }
};

//Delete course
exports.deleteCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    // Find existing course
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
    // Verify user is HOD of the course's department
    const isHod = await prisma.department.findFirst({
      where: { id: course.departmentId, hodId: req.user.id },
    });
    if (!isHod) {
      return res
        .status(403)
        .json({ error: "You are not authorized to delete this course" });
    }

    // Use transaction to cascade delete in order:
    // 1. Delete CLO-PO mappings
    // 2. Delete CLO-PSO mappings
    // 3. Delete CLOs
    // 4. Delete the course
    await prisma.$transaction(async (tx) => {
      // Find all CLOs for this course
      const clos = await tx.clo.findMany({
        where: { courseId },
        select: { id: true },
      });

      const cloIds = clos.map((c) => c.id);

      // Delete CLO-PO mappings
      await tx.cloPoMapping.deleteMany({
        where: { cloId: { in: cloIds } },
      });

      // Delete CLO-PSO mappings
      await tx.cloPsoMapping.deleteMany({
        where: { cloId: { in: cloIds } },
      });

      // Delete CLOs
      await tx.clo.deleteMany({
        where: { courseId },
      });

      // Delete the course
      await tx.course.delete({
        where: { id: courseId },
      });
    });

    res.json({ message: "Course and related data deleted successfully" });
  } catch (error) {
    console.error("deleteCourse error:", error);
    res.status(500).json({ error: error.message });
  }
};
//Get course by Id
exports.getCourseById = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        department: {
          include: {
            program: true,
          },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        clos: { where: { isActive: true } },
      },
    });
    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }
    res.json(course);
  } catch (error) {
    console.error("getCourseById error:", error);
    res.status(500).json({ error: error.message });
  }
};
//Create CLOs under a course
module.exports.createClo = async (req, res) => {
  const { courseId } = req.params;

  const { code, statement, bloomLevel, attainmentThreshold, order, version } =
    req.body;

  const createdById = req.user?.id; // MUST come from auth middleware

  // ❌ Stop immediately if required fields are missing
  if (!code || !statement || !bloomLevel) {
    return res.status(400).json({
      message: "code, statement, and bloomLevel are required",
    });
  }

  if (!createdById) {
    return res.status(401).json({
      message: "Unauthorized",
    });
  }

  try {
    const clo = await prisma.clo.create({
      data: {
        code,
        statement,
        bloomLevel,
        attainmentThreshold,
        order,
        version,
        courseId,
        createdById,
      },
    });

    return res.status(201).json({
      message: "CLO created successfully",
      clo,
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        message: "CLO code already exists for this course",
      });
    }

    console.error(error);
    return res.status(500).json({
      message: "Internal server error",
      error: error,
    });
  }
};

//GET CLOs under a course
module.exports.getClosByCourse = async (req, res) => {
  const { courseId } = req.params;

  // Return full CLO records (all columns) for the course
  const clos = await prisma.clo.findMany({
    where: { courseId, isActive: true },
  });

  res.json(clos);
};

//Update CLOs under a course
module.exports.updateClo = async (req, res) => {
  const { cloId } = req.params;
  const { code, statement, bloomLevel, attainmentThreshold, order } = req.body;
  try {
    const updatedClo = await prisma.clo.update({
      where: { id: cloId },
      data: {
        code,
        statement,
        bloomLevel,
        attainmentThreshold,
        order,
      },
    });
    res.json({
      message: "CLO updated successfully",
      clo: updatedClo,
    });
  } catch (error) {
    console.error("updateClo error:", error);
    res.status(500).json({ error: "Error updating CLO" });
  }
};

//GET POs PSOs under a program
exports.getPosPsosByProgram = async (req, res) => {
  const { courseId } = req.params;

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    include: {
      department: {
        include: { program: true },
      },
    },
  });

  if (!course) return res.status(404).json({ error: "Course not found" });

  const programId = course.department.programId;

  const pos = await prisma.po.findMany({
    where: { programId },
    select: { id: true, code: true },
  });

  const psos = await prisma.pso.findMany({
    where: { programId },
    select: { id: true, code: true },
  });

  res.json({ pos, psos });
};

//MAP CLOs to POs and PSOs
module.exports.mapClosToPosPsos = async (req, res) => {
  console.log("RAW BODY:", JSON.stringify(req.body, null, 2));

  try {
    let { poMappings = [], psoMappings = [] } = req.body;

    // 1️⃣ sanitize inputs
    poMappings = poMappings.filter(
      (m) => m?.cloId && m?.poId && m?.level >= 0 && m?.level <= 3
    );

    psoMappings = psoMappings.filter(
      (m) => m?.cloId && m?.psoId && m?.level >= 0 && m?.level <= 3
    );

    // 2️⃣ collect ALL CLO ids involved
    const cloIds = Array.from(
      new Set([
        ...poMappings.map((m) => m.cloId),
        ...psoMappings.map((m) => m.cloId),
      ])
    );

    // 3️⃣ if nothing to save, stop
    if (cloIds.length === 0)
      return res.status(400).json({ error: "No valid mappings supplied" });

    // 4️⃣ wrap inside transaction — ensures consistency
    await prisma.$transaction([
      prisma.cloPoMapping.deleteMany({
        where: { cloId: { in: cloIds } },
      }),

      prisma.cloPsoMapping.deleteMany({
        where: { cloId: { in: cloIds } },
      }),

      prisma.cloPoMapping.createMany({
        data: poMappings.map((m) => ({
          cloId: m.cloId,
          poId: m.poId,
          level: m.level,
        })),
        skipDuplicates: true,
      }),

      prisma.cloPsoMapping.createMany({
        data: psoMappings.map((m) => ({
          cloId: m.cloId,
          psoId: m.psoId,
          level: m.level,
        })),
        skipDuplicates: true,
      }),
    ]);

    return res.json({ message: "Mappings saved successfully" });
  } catch (err) {
    console.error("❌ mapClosToPosPsos error:", err);
    res.status(500).json({ error: "Error saving mappings" });
  }
};

//Get mappings for a Course
module.exports.getMappings = async (req, res) => {
  const { courseId } = req.params;
  try {
    // Get all CLOs for the course
    const clos = await prisma.clo.findMany({
      where: { courseId },
    });
    const cloIds = clos.map((clo) => clo.id);
    // Get CLO-PO mappings
    const cloPoMappings = await prisma.cloPoMapping.findMany({
      where: { cloId: { in: cloIds } },
    });
    // Get CLO-PSO mappings
    const cloPsoMappings = await prisma.cloPsoMapping.findMany({
      where: { cloId: { in: cloIds } },
    });
    res.json({ cloPoMappings, cloPsoMappings });
  } catch (error) {
    console.error("getMappings error:", error);
    res.status(500).json({ error: "Error fetching mappings" });
  }
};

// Get all faculties in the department
module.exports.getDepartmentFaculties = async (req, res) => {
  try {
    const departmentId = req.user.departmentId;

    if (!departmentId) {
      return res.status(400).json({
        error: "HOD has no department assigned",
      });
    }

    // Verify user is HOD of this department
    const isHod = await prisma.department.findFirst({
      where: {
        id: departmentId,
        hodId: req.user.id,
      },
    });

    if (!isHod) {
      return res.status(403).json({
        error: "You are not authorized as HOD for this department",
      });
    }

    const faculties = await prisma.faculty.findMany({
      where: {
        departmentId,
        isActive: true,
      },
      include: {
        user: {
          select: { email: true },
        },
        courseAssignments: {
          include: {
            course: {
              select: { code: true, name: true },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    res.json(faculties);
  } catch (error) {
    console.error("getDepartmentFaculties error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get available faculties for a course (not already assigned)
module.exports.getAvailableFacultiesForCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { semester, year } = req.query;

    if (!courseId) {
      return res.status(400).json({ error: "Course ID is required" });
    }

    // Get the course and verify department
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { department: true },
    });

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Verify HOD has access to this department
    const isHod = await prisma.department.findFirst({
      where: {
        id: course.departmentId,
        hodId: req.user.id,
      },
    });

    if (!isHod) {
      return res.status(403).json({
        error: "You are not authorized to assign faculty to this course",
      });
    }

    // Get all faculties in the department
    const allFaculties = await prisma.faculty.findMany({
      where: {
        departmentId: course.departmentId,
        isActive: true,
      },
      include: {
        user: {
          select: { email: true },
        },
      },
    });

    // If semester and year provided, check existing assignments
    if (semester && year) {
      const existingAssignments = await prisma.courseFaculty.findMany({
        where: {
          courseId,
          semester: parseInt(semester),
          year: parseInt(year),
        },
        select: { facultyId: true },
      });

      const assignedFacultyIds = existingAssignments.map((a) => a.facultyId);

      // Filter out already assigned faculties
      const availableFaculties = allFaculties.filter(
        (faculty) => !assignedFacultyIds.includes(faculty.id)
      );

      return res.json({
        course,
        faculties: availableFaculties,
        currentSemester: parseInt(semester),
        currentYear: parseInt(year),
      });
    }

    res.json({
      course,
      faculties: allFaculties,
    });
  } catch (error) {
    console.error("getAvailableFacultiesForCourse error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Assign faculty to course
module.exports.assignFacultyToCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { facultyId, semester, year, teachingMethodology, assessmentMode } =
      req.body;

    // Validation
    if (!facultyId || !semester || !year) {
      return res.status(400).json({
        error: "facultyId, semester, and year are required",
      });
    }

    // Get course with department info
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { department: true },
    });

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Verify HOD access
    const isHod = await prisma.department.findFirst({
      where: {
        id: course.departmentId,
        hodId: req.user.id,
      },
    });

    if (!isHod) {
      return res.status(403).json({
        error: "You are not authorized to assign faculty to this course",
      });
    }

    // Check if faculty exists and belongs to same department
    const faculty = await prisma.faculty.findFirst({
      where: {
        id: facultyId,
        departmentId: course.departmentId,
        isActive: true,
      },
    });

    if (!faculty) {
      return res.status(404).json({
        error: "Faculty not found or not in the same department",
      });
    }

    // Check for duplicate assignment
    const existingAssignment = await prisma.courseFaculty.findUnique({
      where: {
        courseId_facultyId_semester_year: {
          courseId,
          facultyId,
          semester: parseInt(semester),
          year: parseInt(year),
        },
      },
    });

    if (existingAssignment) {
      return res.status(400).json({
        error:
          "Faculty is already assigned to this course for the given semester and year",
      });
    }

    // Create assignment
    const assignment = await prisma.courseFaculty.create({
      data: {
        courseId,
        facultyId,
        semester: parseInt(semester),
        year: parseInt(year),
        teachingMethodology,
        assessmentMode,
      },
      include: {
        course: {
          select: { code: true, name: true, semester: true },
        },
        faculty: {
          select: {
            name: true,
            designation: true,
            user: {
              select: { email: true },
            },
          },
        },
      },
    });

    res.status(201).json({
      message: "Faculty assigned successfully",
      assignment,
    });
  } catch (error) {
    console.error("assignFacultyToCourse error:", error);

    if (error.code === "P2002") {
      return res.status(400).json({
        error: "Duplicate assignment detected",
      });
    }

    res.status(500).json({ error: error.message });
  }
};

// Get course assignments
module.exports.getCourseAssignments = async (req, res) => {
  console.log("🎯 getCourseAssignments FUNCTION START");
  console.log("Params:", req.params, "Query:", req.query);
  console.log("User ID:", req.user?.id);

  try {
    const { courseId } = req.params;
    const { semester, year } = req.query;

    if (!courseId) {
      console.log("❌ No courseId provided");
      return res.status(400).json({ error: "Course ID is required" });
    }

    console.log("🔍 Step 1: Looking for course...");
    // Get course with department info
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { department: true },
    });

    console.log("🔍 Course found:", !!course);

    if (!course) {
      console.log("❌ Course not found");
      return res.status(404).json({ error: "Course not found" });
    }

    console.log("🔍 Step 2: Checking HOD access...");
    // Verify HOD access
    const isHod = await prisma.department.findFirst({
      where: {
        id: course.departmentId,
        hodId: req.user.id,
      },
    });

    console.log("🔍 Is HOD?", !!isHod);

    if (!isHod) {
      console.log("❌ Not authorized as HOD");
      return res.status(403).json({
        error: "You are not authorized to view assignments for this course",
      });
    }

    console.log("🔍 Step 3: Building where clause...");
    // Build where clause
    const whereClause = { courseId };
    if (semester) whereClause.semester = parseInt(semester);
    if (year) whereClause.year = parseInt(year);

    console.log("🔍 Where clause:", whereClause);

    console.log("🔍 Step 4: Fetching assignments...");
    const assignments = await prisma.courseFaculty.findMany({
      where: whereClause,
      include: {
        faculty: {
          include: {
            user: {
              select: { email: true },
            },
          },
        },
        course: {
          select: { code: true, name: true },
        },
      },
      orderBy: [{ year: "desc" }, { semester: "asc" }, { createdAt: "desc" }],
    });

    // Add this debug log
    console.log("🔍 First assignment with faculty:", {
      hasFaculty: !!assignments[0]?.faculty,
      faculty: assignments[0]?.faculty,
      facultyId: assignments[0]?.facultyId,
    });

    console.log("✅ Found assignments:", assignments.length);
    console.log("✅ Sending response...");

    res.json({
      course,
      assignments,
    });

    console.log("🎯 getCourseAssignments FUNCTION END");
  } catch (error) {
    console.error("🔥 ERROR in getCourseAssignments:", error);
    console.error("🔥 Error stack:", error.stack);
    res.status(500).json({ error: error.message });
  }
};
// Update assignment
module.exports.updateAssignment = async (req, res) => {
  try {
    const { courseId, facultyId, semester, year } = req.params;
    const { teachingMethodology, assessmentMode, newFacultyId } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    console.log(`🎯 updateAssignment called:`, {
      courseId,
      facultyId,
      semester,
      year,
      teachingMethodology,
      assessmentMode,
      newFacultyId,
      userRole,
      userId,
    });

    // Convert to integers
    const semesterInt = parseInt(semester);
    const yearInt = parseInt(year);

    // Check if assignment exists
    const existingAssignment = await prisma.courseFaculty.findUnique({
      where: {
        courseId_facultyId_semester_year: {
          courseId,
          facultyId,
          semester: semesterInt,
          year: yearInt,
        },
      },
      include: {
        course: {
          select: { departmentId: true },
        },
      },
    });

    if (!existingAssignment) {
      return res.status(404).json({ error: "Assignment not found" });
    }

    // For Faculty users: Can only update teaching methodology and assessment mode
    if (userRole === "FACULTY") {
      // Check if faculty is updating their own assignment
      if (facultyId !== userId) {
        return res.status(403).json({
          error: "You can only update your own assignments",
        });
      }

      // Update only teaching methodology and assessment mode
      const updatedAssignment = await prisma.courseFaculty.update({
        where: {
          courseId_facultyId_semester_year: {
            courseId,
            facultyId,
            semester: semesterInt,
            year: yearInt,
          },
        },
        data: {
          teachingMethodology,
          assessmentMode,
          updatedAt: new Date(),
        },
        include: {
          faculty: {
            select: { name: true, designation: true },
          },
          course: {
            select: { code: true, name: true },
          },
        },
      });

      return res.json({
        message: "Assignment updated successfully",
        assignment: updatedAssignment,
      });
    }

    // For HOD users: Can update everything and reassign faculty
    if (userRole === "HOD") {
      // Verify HOD belongs to the course's department
      const isHod = await prisma.department.findFirst({
        where: {
          id: existingAssignment.course.departmentId,
          hodId: userId,
        },
      });

      if (!isHod) {
        return res.status(403).json({
          error: "You are not authorized to update this assignment",
        });
      }

      // Check if reassigning to a new faculty
      if (newFacultyId && newFacultyId !== facultyId) {
        console.log(`🔄 Reassigning from ${facultyId} to ${newFacultyId}`);

        // Check if new faculty exists
        const newFaculty = await prisma.faculty.findUnique({
          where: { id: newFacultyId },
        });

        if (!newFaculty) {
          return res.status(404).json({ error: "New faculty not found" });
        }

        // Check if new assignment already exists
        const existingNewAssignment = await prisma.courseFaculty.findUnique({
          where: {
            courseId_facultyId_semester_year: {
              courseId,
              facultyId: newFacultyId,
              semester: semesterInt,
              year: yearInt,
            },
          },
        });

        if (existingNewAssignment) {
          return res.status(400).json({
            error:
              "New faculty is already assigned to this course for the given semester and year",
          });
        }

        // Use transaction for delete and create
        const result = await prisma.$transaction(async (tx) => {
          // Delete old assignment
          await tx.courseFaculty.delete({
            where: {
              courseId_facultyId_semester_year: {
                courseId,
                facultyId,
                semester: semesterInt,
                year: yearInt,
              },
            },
          });

          // Create new assignment
          const newAssignment = await tx.courseFaculty.create({
            data: {
              courseId,
              facultyId: newFacultyId,
              semester: semesterInt,
              year: yearInt,
              teachingMethodology:
                teachingMethodology || existingAssignment.teachingMethodology,
              assessmentMode:
                assessmentMode || existingAssignment.assessmentMode,
              // Add these if they exist in your schema:
              // assignedBy: userId,
              // assignedAt: new Date()
            },
            include: {
              faculty: {
                select: { name: true, designation: true },
              },
              course: {
                select: { code: true, name: true },
              },
            },
          });

          return newAssignment;
        });

        return res.json({
          message: "Faculty reassigned successfully",
          assignment: result,
        });
      } else {
        // Just update teaching methodology and assessment mode
        const updatedAssignment = await prisma.courseFaculty.update({
          where: {
            courseId_facultyId_semester_year: {
              courseId,
              facultyId,
              semester: semesterInt,
              year: yearInt,
            },
          },
          data: {
            teachingMethodology,
            assessmentMode,
            updatedAt: new Date(),
          },
          include: {
            faculty: {
              select: { name: true, designation: true },
            },
            course: {
              select: { code: true, name: true },
            },
          },
        });

        return res.json({
          message: "Assignment updated successfully",
          assignment: updatedAssignment,
        });
      }
    }

    // For other roles
    return res.status(403).json({
      error: "Unauthorized role",
    });
  } catch (error) {
    console.error("❌ updateAssignment error:", error);

    if (error.code === "P2025") {
      return res.status(404).json({ error: "Assignment not found" });
    }

    if (error.code === "P2002") {
      return res.status(400).json({
        error: "Assignment already exists",
      });
    }

    res.status(500).json({
      error: "Failed to update assignment",
      details: error.message,
    });
  }
};
// Remove faculty assignment
module.exports.removeFacultyAssignment = async (req, res) => {
  try {
    const { courseId, facultyId, semester, year } = req.params;

    // Verify HOD access
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: { department: true },
    });

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    const isHod = await prisma.department.findFirst({
      where: {
        id: course.departmentId,
        hodId: req.user.id,
      },
    });

    if (!isHod) {
      return res.status(403).json({
        error: "You are not authorized to remove this assignment",
      });
    }

    await prisma.courseFaculty.delete({
      where: {
        courseId_facultyId_semester_year: {
          courseId,
          facultyId,
          semester: parseInt(semester),
          year: parseInt(year),
        },
      },
    });

    res.json({ message: "Faculty assignment removed successfully" });
  } catch (error) {
    console.error("removeFacultyAssignment error:", error);

    if (error.code === "P2025") {
      return res.status(404).json({ error: "Assignment not found" });
    }

    res.status(500).json({ error: error.message });
  }
};

// Get faculty workload (all assignments for a faculty)
module.exports.getFacultyWorkload = async (req, res) => {
  try {
    const { facultyId } = req.params;
    const { year } = req.query;

    // Get faculty with department info
    const faculty = await prisma.faculty.findUnique({
      where: { id: facultyId },
      include: { department: true },
    });

    if (!faculty) {
      return res.status(404).json({ error: "Faculty not found" });
    }

    // Verify HOD access to faculty's department
    const isHod = await prisma.department.findFirst({
      where: {
        id: faculty.departmentId,
        hodId: req.user.id,
      },
    });

    if (!isHod) {
      return res.status(403).json({
        error: "You are not authorized to view this faculty's workload",
      });
    }

    // Build where clause
    const whereClause = { facultyId };
    if (year) whereClause.year = parseInt(year);

    const assignments = await prisma.courseFaculty.findMany({
      where: whereClause,
      include: {
        course: {
          select: {
            code: true,
            name: true,
            credits: true,
            semester: true,
            type: true,
          },
        },
      },
      orderBy: [{ year: "desc" }, { semester: "asc" }],
    });

    // Calculate total credits per semester/year
    const workloadSummary = assignments.reduce((acc, assignment) => {
      const key = `${assignment.year}_${assignment.semester}`;
      if (!acc[key]) {
        acc[key] = {
          year: assignment.year,
          semester: assignment.semester,
          totalCredits: 0,
          courseCount: 0,
          courses: [],
        };
      }

      acc[key].totalCredits += assignment.course.credits || 0;
      acc[key].courseCount += 1;
      acc[key].courses.push({
        courseCode: assignment.course.code,
        courseName: assignment.course.name,
        credits: assignment.course.credits,
        type: assignment.course.type,
      });

      return acc;
    }, {});

    res.json({
      faculty: {
        id: faculty.id,
        name: faculty.name,
        designation: faculty.designation,
        department: faculty.department.name,
      },
      assignments,
      workloadSummary: Object.values(workloadSummary),
    });
  } catch (error) {
    console.error("getFacultyWorkload error:", error);
    res.status(500).json({ error: error.message });
  }
};
exports.getCourseById = async (req, res) => {
  try {
    const { courseId } = req.params;
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        department: {
          include: {
            program: { select: { id: true, name: true, slug: true } },
          },
        },
        createdBy: { select: { id: true, name: true, email: true } },
      },
    });
    res.json(course);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
// Get all faculty assignments for HOD's department
// Get all faculty assignments for HOD's department
module.exports.getAllDepartmentAssignments = async (req, res) => {
  console.log("🎯 getAllDepartmentAssignments FUNCTION START");
  console.log("User:", req.user);

  try {
    const departmentId = req.user.departmentId;
    const {
      semester,
      year,
      facultyId,
      courseId,
      page = 1,
      limit = 20,
      status = "all",
    } = req.query;

    // Validation
    if (!departmentId) {
      console.log("❌ No departmentId in user");
      return res.status(400).json({
        error: "HOD has no department assigned",
      });
    }

    // Verify HOD access
    console.log("🔍 Step 1: Verifying HOD access...");
    const isHod = await prisma.department.findFirst({
      where: {
        id: departmentId,
        hodId: req.user.id,
      },
      select: { id: true, name: true },
    });

    if (!isHod) {
      console.log("❌ User is not HOD of this department");
      return res.status(403).json({
        error: "You are not authorized as HOD for this department",
      });
    }

    console.log("✅ HOD verified for department:", isHod.name);

    // Build filter conditions
    const whereClause = {
      AND: [
        {
          course: {
            departmentId: departmentId,
          },
        },
      ],
    };

    // Add optional filters
    if (semester) {
      whereClause.AND.push({ semester: parseInt(semester) });
    }

    if (year) {
      whereClause.AND.push({ year: parseInt(year) });
    }

    if (facultyId) {
      whereClause.AND.push({ facultyId });
    }

    if (courseId) {
      whereClause.AND.push({ courseId });
    }

    console.log("🔍 Step 2: Counting total assignments...");
    // Get total count
    const totalAssignments = await prisma.courseFaculty.count({
      where: whereClause,
    });

    console.log("🔍 Step 3: Fetching assignments with pagination...");
    // Get assignments with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const assignments = await prisma.courseFaculty.findMany({
      where: whereClause,
      include: {
        faculty: {
          include: {
            user: {
              select: { email: true },
            },
          },
        },
        course: {
          select: {
            id: true,
            code: true,
            name: true,
            semester: true,
            credits: true,
            type: true,
          },
        },
      },
      orderBy: [{ year: "desc" }, { semester: "desc" }, { createdAt: "desc" }],
      skip: skip,
      take: parseInt(limit),
    });

    console.log("🔍 Step 4: Getting department summary...");
    // Get department summary info
    const departmentSummary = await prisma.department.findUnique({
      where: { id: departmentId },
      select: {
        id: true,
        name: true,
        code: true,
        _count: {
          select: {
            courses: { where: { isActive: true } },
            faculties: { where: { isActive: true } },
          },
        },
      },
    });

    console.log("🔍 Step 5: Getting unique years and semesters...");
    // Get unique years and semesters for filters
    const uniqueYears = await prisma.courseFaculty.findMany({
      where: {
        course: {
          departmentId: departmentId,
        },
      },
      distinct: ["year"],
      select: { year: true },
      orderBy: { year: "desc" },
    });

    const uniqueSemesters = await prisma.courseFaculty.findMany({
      where: {
        course: {
          departmentId: departmentId,
        },
      },
      distinct: ["semester"],
      select: { semester: true },
      orderBy: { semester: "asc" },
    });

    console.log("✅ Data fetched successfully");

    res.json({
      department: departmentSummary,
      assignments,
      summary: {
        totalAssignments,
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalAssignments / limit),
        limit: parseInt(limit),
      },
      filters: {
        years: uniqueYears.map((y) => y.year),
        semesters: uniqueSemesters.map((s) => s.semester),
      },
    });
  } catch (error) {
    console.error("🔥 ERROR in getAllDepartmentAssignments:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get assignments statistics for dashboard
module.exports.getAssignmentsStats = async (req, res) => {
  try {
    console.log("🎯 getAssignmentsStats FUNCTION START");
    const departmentId = req.user.departmentId;

    if (!departmentId) {
      return res.status(400).json({
        error: "HOD has no department assigned",
      });
    }

    // Verify HOD access
    const isHod = await prisma.department.findFirst({
      where: {
        id: departmentId,
        hodId: req.user.id,
      },
    });

    if (!isHod) {
      return res.status(403).json({
        error: "You are not authorized as HOD for this department",
      });
    }

    // Get current academic year
    const currentYear = new Date().getFullYear();

    // Total assignments
    const totalAssignments = await prisma.courseFaculty.count({
      where: {
        course: {
          departmentId: departmentId,
        },
      },
    });

    // Current year assignments
    const currentYearAssignments = await prisma.courseFaculty.count({
      where: {
        year: currentYear,
        course: {
          departmentId: departmentId,
        },
      },
    });

    // Assignments by semester
    const assignmentsBySemester = await prisma.courseFaculty.groupBy({
      by: ["semester"],
      where: {
        year: currentYear,
        course: {
          departmentId: departmentId,
        },
      },
      _count: true,
      orderBy: {
        semester: "asc",
      },
    });

    // Faculty with most assignments
    const topFaculties = await prisma.courseFaculty.groupBy({
      by: ["facultyId"],
      where: {
        year: currentYear,
        course: {
          departmentId: departmentId,
        },
      },
      _count: true,
      orderBy: {
        _count: {
          facultyId: "desc",
        },
      },
      take: 5,
    });

    // Populate faculty names
    const topFacultiesWithNames = await Promise.all(
      topFaculties.map(async (item) => {
        const faculty = await prisma.faculty.findUnique({
          where: { id: item.facultyId },
          select: { name: true, designation: true },
        });
        return {
          facultyId: item.facultyId,
          name: faculty?.name || "Unknown",
          designation: faculty?.designation,
          assignmentCount: item._count,
        };
      })
    );

    // Courses with most faculties assigned
    const topCourses = await prisma.courseFaculty.groupBy({
      by: ["courseId"],
      where: {
        year: currentYear,
        course: {
          departmentId: departmentId,
        },
      },
      _count: true,
      orderBy: {
        _count: {
          courseId: "desc",
        },
      },
      take: 5,
    });

    // Populate course names
    const topCoursesWithNames = await Promise.all(
      topCourses.map(async (item) => {
        const course = await prisma.course.findUnique({
          where: { id: item.courseId },
          select: { code: true, name: true, semester: true },
        });
        return {
          courseId: item.courseId,
          code: course?.code || "Unknown",
          name: course?.name || "Unknown",
          semester: course?.semester,
          facultyCount: item._count,
        };
      })
    );

    res.json({
      overview: {
        totalAssignments,
        currentYearAssignments,
        currentYear,
      },
      bySemester: assignmentsBySemester.map((item) => ({
        semester: item.semester,
        count: item._count,
      })),
      topFaculties: topFacultiesWithNames,
      topCourses: topCoursesWithNames,
    });
  } catch (error) {
    console.error("getAssignmentsStats error:", error);
    res.status(500).json({ error: error.message });
  }
};
