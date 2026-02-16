// backend/controllers/hod/reports.controller.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Get comprehensive program report data
const getProgramReport = async (req, res) => {
  try {
    const userId = req.user.id;
    const { programId } = req.query;

    if (!programId) {
      return res.status(400).json({ error: "Program ID is required" });
    }

    // Get HOD's departments
    const departments = await prisma.department.findMany({
      where: {
        OR: [{ hodId: userId }, { id: req.user.departmentId }],
      },
      select: { id: true, programId: true },
    });

    if (!departments || departments.length === 0) {
      return res.status(400).json({ error: "No departments assigned" });
    }

    // Get all POs and PSOs for the program
    const [pos, psos] = await Promise.all([
      prisma.po.findMany({
        where: { isActive: true, programId },
        include: {
          program: { select: { name: true } }
        },
        orderBy: { order: "asc" }
      }),
      prisma.pso.findMany({
        where: { isActive: true, programId },
        include: {
          program: { select: { name: true } }
        },
        orderBy: { order: "asc" }
      })
    ]);

    // Get courses with their CLOs and mappings - CORRECT relation names
    const courses = await prisma.course.findMany({
      where: {
        departmentId: { in: departments.map(d => d.id) },
        isActive: true
      },
      include: {
        department: {
          include: {
            program: { select: { id: true, name: true } }
          }
        },
        clos: {
          where: { isActive: true },
          include: {
            // CORRECT relation names from schema
            poMappings: {
              include: { 
                po: {
                  select: { id: true, code: true, statement: true }
                }
              }
            },
            psoMappings: {
              include: { 
                pso: {
                  select: { id: true, code: true, statement: true }
                }
              }
            },
            course: true,
            createdBy: true
          },
          orderBy: { order: "asc" }
        }
      },
      orderBy: [{ semester: "asc" }, { code: "asc" }]
    });

    // Filter courses by program
    const filteredCourses = courses.filter(
      course => course.department?.program?.id === programId
    );

    if (filteredCourses.length === 0) {
      return res.json({
        success: true,
        data: {
          program: await prisma.program.findUnique({ 
            where: { id: programId },
            select: { id: true, name: true, code: true }
          }),
          pos,
          psos,
          courses: [],
          radarData: [],
          heatmapData: { courses: [], pos: [], psos: [], matrix: {} },
          cloDetails: [],
          coursePOContributions: {},
          coursePSOContributions: {}
        }
      });
    }

    // Calculate course contributions to POs
    const coursePOContributions = {};
    const coursePSOContributions = {};

    filteredCourses.forEach(course => {
      coursePOContributions[course.id] = {};
      coursePSOContributions[course.id] = {};

      // Initialize PO contributions
      pos.forEach(po => {
        coursePOContributions[course.id][po.id] = {
          poCode: po.code,
          totalLevel: 0,
          count: 0,
          clos: []
        };
      });

      // Initialize PSO contributions
      psos.forEach(pso => {
        coursePSOContributions[course.id][pso.id] = {
          psoCode: pso.code,
          totalLevel: 0,
          count: 0,
          clos: []
        };
      });

      // Calculate PO contributions from CLOs
      course.clos.forEach(clo => {
        // PO Mappings - using poMappings
        if (clo.poMappings && clo.poMappings.length > 0) {
          clo.poMappings.forEach(mapping => {
            if (coursePOContributions[course.id][mapping.poId]) {
              coursePOContributions[course.id][mapping.poId].totalLevel += mapping.level;
              coursePOContributions[course.id][mapping.poId].count += 1;
              coursePOContributions[course.id][mapping.poId].clos.push({
                cloCode: clo.code,
                level: mapping.level,
                bloomLevel: clo.bloomLevel,
                cloId: clo.id
              });
            }
          });
        }

        // PSO Mappings - using psoMappings
        if (clo.psoMappings && clo.psoMappings.length > 0) {
          clo.psoMappings.forEach(mapping => {
            if (coursePSOContributions[course.id][mapping.psoId]) {
              coursePSOContributions[course.id][mapping.psoId].totalLevel += mapping.level;
              coursePSOContributions[course.id][mapping.psoId].count += 1;
              coursePSOContributions[course.id][mapping.psoId].clos.push({
                cloCode: clo.code,
                level: mapping.level,
                bloomLevel: clo.bloomLevel,
                cloId: clo.id
              });
            }
          });
        }
      });

      // Calculate averages for POs
      Object.keys(coursePOContributions[course.id]).forEach(poId => {
        const data = coursePOContributions[course.id][poId];
        data.averageLevel = data.count > 0 ? Number((data.totalLevel / data.count).toFixed(2)) : 0;
      });

      // Calculate averages for PSOs
      Object.keys(coursePSOContributions[course.id]).forEach(psoId => {
        const data = coursePSOContributions[course.id][psoId];
        data.averageLevel = data.count > 0 ? Number((data.totalLevel / data.count).toFixed(2)) : 0;
      });
    });

    // Prepare radar chart data
    const radarData = filteredCourses.map(course => {
      const poData = {
        course: `${course.code} - ${course.name}`,
        courseId: course.id,
        semester: course.semester
      };
      
      pos.forEach(po => {
        poData[po.code] = coursePOContributions[course.id]?.[po.id]?.averageLevel || 0;
      });
      
      psos.forEach(pso => {
        poData[pso.code] = coursePSOContributions[course.id]?.[pso.id]?.averageLevel || 0;
      });

      return poData;
    });

    // Prepare heatmap matrix data
    const heatmapData = {
      courses: filteredCourses.map(c => ({
        id: c.id,
        code: c.code,
        name: c.name,
        semester: c.semester
      })),
      pos: pos.map(p => ({ 
        id: p.id, 
        code: p.code, 
        name: p.statement ? p.statement.substring(0, 50) : '' 
      })),
      psos: psos.map(p => ({ 
        id: p.id, 
        code: p.code, 
        name: p.statement ? p.statement.substring(0, 50) : '' 
      })),
      matrix: {}
    };

    filteredCourses.forEach(course => {
      heatmapData.matrix[course.id] = {};
      
      pos.forEach(po => {
        heatmapData.matrix[course.id][po.id] = {
          value: coursePOContributions[course.id]?.[po.id]?.averageLevel || 0,
          clos: coursePOContributions[course.id]?.[po.id]?.clos || []
        };
      });

      psos.forEach(pso => {
        heatmapData.matrix[course.id][pso.id] = {
          value: coursePSOContributions[course.id]?.[pso.id]?.averageLevel || 0,
          clos: coursePSOContributions[course.id]?.[pso.id]?.clos || []
        };
      });
    });

    // Get CLO-level detailed data
    const cloDetails = filteredCourses.flatMap(course => 
      course.clos.map(clo => ({
        courseId: course.id,
        courseCode: course.code,
        courseName: course.name,
        cloId: clo.id,
        cloCode: clo.code,
        cloStatement: clo.statement,
        bloomLevel: clo.bloomLevel,
        poMappings: clo.poMappings?.map(m => ({
          poId: m.poId,
          poCode: m.po?.code,
          level: m.level
        })) || [],
        psoMappings: clo.psoMappings?.map(m => ({
          psoId: m.psoId,
          psoCode: m.pso?.code,
          level: m.level
        })) || []
      }))
    );

    // Get program info
    const program = await prisma.program.findUnique({ 
      where: { id: programId },
      select: { id: true, name: true, code: true }
    });

    res.json({
      success: true,
      data: {
        program,
        pos,
        psos,
        courses: filteredCourses,
        radarData,
        heatmapData,
        cloDetails,
        coursePOContributions,
        coursePSOContributions
      }
    });

  } catch (error) {
    console.error("getProgramReport error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get detailed course contribution
const getCourseContributionDetails = async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await prisma.course.findUnique({
      where: { id: courseId, isActive: true },
      include: {
        department: {
          include: { 
            program: {
              select: { id: true, name: true, code: true }
            } 
          }
        },
        clos: {
          where: { isActive: true },
          include: {
            // CORRECT relation names
            poMappings: {
              include: { 
                po: {
                  select: { id: true, code: true, statement: true }
                }
              }
            },
            psoMappings: {
              include: { 
                pso: {
                  select: { id: true, code: true, statement: true }
                }
              }
            },
            course: true,
            createdBy: true
          },
          orderBy: { order: "asc" }
        }
      }
    });

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    // Prepare CLO contribution data
    const cloContributions = course.clos.map(clo => {
      const poMappings = {};
      const psoMappings = {};

      // Process PO mappings
      if (clo.poMappings && clo.poMappings.length > 0) {
        clo.poMappings.forEach(m => {
          if (m.po) {
            poMappings[m.po.code] = {
              level: m.level,
              statement: m.po.statement,
              poId: m.po.id
            };
          }
        });
      }

      // Process PSO mappings
      if (clo.psoMappings && clo.psoMappings.length > 0) {
        clo.psoMappings.forEach(m => {
          if (m.pso) {
            psoMappings[m.pso.code] = {
              level: m.level,
              statement: m.pso.statement,
              psoId: m.pso.id
            };
          }
        });
      }

      const poCount = Object.keys(poMappings).length;
      const psoCount = Object.keys(psoMappings).length;

      return {
        cloId: clo.id,
        cloCode: clo.code,
        cloStatement: clo.statement,
        bloomLevel: clo.bloomLevel,
        poMappings,
        psoMappings,
        totalMappings: poCount + psoCount,
        averagePoLevel: poCount > 0 
          ? Number((Object.values(poMappings).reduce((sum, m) => sum + m.level, 0) / poCount).toFixed(2))
          : 0,
        averagePsoLevel: psoCount > 0
          ? Number((Object.values(psoMappings).reduce((sum, m) => sum + m.level, 0) / psoCount).toFixed(2))
          : 0
      };
    });

    // Calculate course averages
    const totalPoMappings = cloContributions.reduce((sum, clo) => sum + Object.keys(clo.poMappings).length, 0);
    const totalPsoMappings = cloContributions.reduce((sum, clo) => sum + Object.keys(clo.psoMappings).length, 0);
    
    const validPoContributions = cloContributions.filter(c => c.averagePoLevel > 0);
    const validPsoContributions = cloContributions.filter(c => c.averagePsoLevel > 0);
    
    const avgPoLevel = validPoContributions.length > 0
      ? Number((validPoContributions.reduce((sum, clo) => sum + clo.averagePoLevel, 0) / validPoContributions.length).toFixed(2))
      : 0;
    
    const avgPsoLevel = validPsoContributions.length > 0
      ? Number((validPsoContributions.reduce((sum, clo) => sum + clo.averagePsoLevel, 0) / validPsoContributions.length).toFixed(2))
      : 0;

    res.json({
      success: true,
      data: {
        course: {
          id: course.id,
          code: course.code,
          name: course.name,
          semester: course.semester,
          credits: course.credits
        },
        program: course.department.program,
        cloContributions,
        summary: {
          totalClos: course.clos.length,
          totalPoMappings,
          totalPsoMappings,
          avgPoLevel,
          avgPsoLevel,
          mappedClos: cloContributions.filter(c => c.totalMappings > 0).length
        }
      }
    });

  } catch (error) {
    console.error("getCourseContributionDetails error:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getProgramReport,
  getCourseContributionDetails
};