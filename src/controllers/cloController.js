// backend/src/controllers/cloController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const createCLO = async (req, res) => {
  try {
    const { cloCode, description, bloomLevel, version, courseId } = req.body;
    
    const clo = await prisma.cLO.create({
      data: {
        cloCode,
        description,
        bloomLevel,
        version,
        courseId,
        createdById: req.user.id
      },
      include: {
        course: true,
        mappings: {
          include: {
            po: true,
            pso: true
          }
        }
      }
    });

    res.status(201).json(clo);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getCLOsByCourse = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    const clos = await prisma.cLO.findMany({
      where: { 
        courseId,
        isActive: true 
      },
      include: {
        mappings: {
          include: {
            po: true,
            pso: true
          }
        },
        course: true
      }
    });

    res.json(clos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const updateCLO = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const clo = await prisma.cLO.update({
      where: { id },
      data: updates,
      include: {
        mappings: {
          include: {
            po: true,
            pso: true
          }
        }
      }
    });

    res.json(clo);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const mapCLOToPOPSO = async (req, res) => {
  try {
    const { cloId, poId, psoId, correlation } = req.body;

    const mapping = await prisma.cLOPOPSOMapping.create({
      data: {
        cloId,
        poId,
        psoId,
        correlation: parseInt(correlation)
      },
      include: {
        clo: true,
        po: true,
        pso: true
      }
    });

    res.status(201).json(mapping);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

module.exports = { createCLO, getCLOsByCourse, updateCLO, mapCLOToPOPSO };