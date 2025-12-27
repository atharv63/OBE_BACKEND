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

  const clos = await prisma.clo.findMany({
    where: { courseId, isActive: true },
    select: { id: true, code: true },
  });

  res.json(clos);
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
