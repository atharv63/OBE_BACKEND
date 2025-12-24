// backend/src/controllers/courseController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createCourse = async (req, res) => {
  try {
    const { code, name, description, credits, category, version, threshold } = req.body;
    
    const course = await prisma.course.create({
      data: {
        code,
        name,
        description,
        credits: parseInt(credits),
        category,
        version,
        threshold: parseFloat(threshold),
        departmentId: req.user.departmentId,
        createdById: req.user.id
      }
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
        isActive: true 
      },
      include: {
        createdBy: { select: { name: true } },
        clos: { where: { isActive: true } },
        assignments: {
          include: {
            faculty: { select: { name: true } }
          }
        }
      }
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
      data: updates
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
      data: { isActive: false }
    });

    res.json({ message: 'Course deactivated successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { createCourse, getCourses, updateCourse, deleteCourse };