// backend/src/controllers/courseController.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const createCourse = async (req, res) => {
  try {
    // Accept fields: code, name, slug, semester, credits, programid (mapped to departmentId), type, category, description, isActive
    const {
      code,
      name,
      slug,
      semester,
      credits,
      programid,
      departmentId: bodyDepartmentId,
      type,
      category,
      description,
      isActive,
    } = req.body;

    // Determine departmentId: prefer explicit departmentId, then programid, then user's department
    const departmentId = bodyDepartmentId || programid || req.user.departmentId;

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
    res.status(400).json({ error: error.message });
  }
};

const getCourses = async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      where: {
        departmentId: req.user.departmentId,
        isActive: true,
      },
      include: {
        createdBy: { select: { name: true } },
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
    res.status(500).json({ error: error.message });
  }
};

const updateCourse = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const course = await prisma.course.update({
      where: { id },
      data: updates,
    });

    res.json(course);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const deleteCourse = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.course.update({
      where: { id },
      data: { isActive: false },
    });

    res.json({ message: "Course deactivated successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { createCourse, getCourses, updateCourse, deleteCourse };
