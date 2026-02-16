const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const getFacultyId = async (userId) => {
  console.log('[DEBUG] getFacultyId called with userId:', userId);
  
  const faculty = await prisma.faculty.findFirst({
    where: { userId, isActive: true }
  });
  
  console.log('[DEBUG] Raw faculty query result:', faculty);
  console.log('[DEBUG] Resolved faculty ID:', faculty ? faculty.id : 'Not found');
  
  if (!faculty) {
    console.error('[DEBUG] Faculty profile not found for userId:', userId);
    throw new Error('Faculty profile not found');
  }
  
  return faculty.id;
};

// Map CLOs to assessment with marks allocation
const mapClosToAssessment = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const { cloAllocations } = req.body; // Array of { cloId, marksAllocated, bloomLevel, weightage }
    const facultyId = await getFacultyId(req.user.id);

    // 1. Verify assessment exists and belongs to faculty
    const assessment = await prisma.assessment.findUnique({
      where: { 
        id: assessmentId,
        isActive: true 
      },
      include: {
        course: {
          select: {
            id: true
          }
        }
      }
    });

    if (!assessment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Assessment not found' 
      });
    }

    if (assessment.facultyId !== facultyId) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to modify this assessment' 
      });
    }

    // 2. Check if marks have been entered (prevent changes if marks exist)
    const marksCount = await prisma.mark.count({
      where: { assessmentId }
    });

    if (marksCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot modify CLO allocations after marks have been entered'
      });
    }

    // 3. Validate total allocated marks equals assessment max marks
    const totalAllocated = cloAllocations.reduce((sum, allocation) => 
      sum + parseFloat(allocation.marksAllocated), 0
    );

    if (totalAllocated !== assessment.maxMarks) {
      return res.status(400).json({
        success: false,
        message: `Total allocated marks (${totalAllocated}) must equal assessment max marks (${assessment.maxMarks})`,
        totalAllocated,
        assessmentMaxMarks: assessment.maxMarks,
        difference: assessment.maxMarks - totalAllocated
      });
    }

    // 4. Validate CLOs belong to the course
    const cloIds = cloAllocations.map(a => a.cloId);
    const clos = await prisma.clo.findMany({
      where: {
        id: { in: cloIds },
        courseId: assessment.course.id,
        isActive: true
      }
    });

    if (clos.length !== cloAllocations.length) {
      const invalidClos = cloAllocations.filter(
        allocation => !clos.find(clo => clo.id === allocation.cloId)
      );
      return res.status(400).json({
        success: false,
        message: 'Some CLOs do not belong to this course',
        invalidClos
      });
    }

    // 5. Delete existing allocations and create new ones
    await prisma.$transaction(async (tx) => {
      // Delete existing allocations
      await tx.assessmentClo.deleteMany({
        where: { assessmentId }
      });

      // Create new allocations
      const allocationsData = cloAllocations.map(allocation => ({
        assessmentId,
        cloId: allocation.cloId,
        bloomLevel: allocation.bloomLevel,
        marksAllocated: parseFloat(allocation.marksAllocated),
        weightage: parseFloat(allocation.weightage) || 
                  (parseFloat(allocation.marksAllocated) / assessment.maxMarks) * 100
      }));

      await tx.assessmentClo.createMany({
        data: allocationsData
      });
    });

    // 6. Get updated assessment with CLOs
    const updatedAssessment = await prisma.assessment.findUnique({
      where: { id: assessmentId },
      include: {
        assessmentClos: {
          include: {
            clo: {
              select: {
                code: true,
                statement: true,
                bloomLevel: true
              }
            }
          }
        },
        course: {
          select: {
            code: true,
            name: true
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      message: 'CLOs mapped to assessment successfully',
      data: {
        assessment: updatedAssessment,
        summary: {
          totalClos: cloAllocations.length,
          totalMarksAllocated: totalAllocated,
          maxMarks: assessment.maxMarks
        }
      }
    });

  } catch (error) {
    console.error('Error mapping CLOs to assessment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error mapping CLOs to assessment',
      error: error.message 
    });
  }
};

// Get CLO mappings for assessment
const getAssessmentClos = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const facultyId = await getFacultyId(req.user.id);

    // Verify assessment exists and belongs to faculty
    const assessment = await prisma.assessment.findUnique({
      where: { 
        id: assessmentId,
        isActive: true 
      }
    });

    if (!assessment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Assessment not found' 
      });
    }

    if (assessment.facultyId !== facultyId) {
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to view this assessment' 
      });
    }

    // Get CLOs for the course (to show all available CLOs)
    const courseClos = await prisma.clo.findMany({
      where: {
        courseId: assessment.courseId,
        isActive: true
      },
      select: {
        id: true,
        code: true,
        statement: true,
        bloomLevel: true,
        attainmentThreshold: true,
        order: true
      },
      orderBy: {
        order: 'asc'
      }
    });

    // Get existing CLO mappings for the assessment
    const assessmentClos = await prisma.assessmentClo.findMany({
      where: { assessmentId },
      include: {
        clo: {
          select: {
            code: true,
            statement: true,
            bloomLevel: true
          }
        }
      }
    });

    // Format response to show allocated vs available
    const availableClos = courseClos.map(clo => {
      const allocated = assessmentClos.find(ac => ac.cloId === clo.id);
      return {
        ...clo,
        allocated: !!allocated,
        marksAllocated: allocated ? allocated.marksAllocated : 0,
        weightage: allocated ? allocated.weightage : 0
      };
    });

    res.status(200).json({
      success: true,
      data: {
        assessment: {
          id: assessment.id,
          title: assessment.title,
          maxMarks: assessment.maxMarks,
          type: assessment.type
        },
        clos: availableClos,
        mappings: assessmentClos,
        summary: {
          totalClos: courseClos.length,
          allocatedClos: assessmentClos.length,
          totalMarksAllocated: assessmentClos.reduce((sum, ac) => sum + ac.marksAllocated, 0)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching assessment CLOs:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching assessment CLOs',
      error: error.message 
    });
  }
};

// Get CLOs for course (for assessment creation)
const getCourseClos = async (req, res) => {
  try {
    const { courseId } = req.params;

    const facultyId = await getFacultyId(req.user.id);
    console.log('Fetching CLOs for course:', courseId, 'by faculty:', facultyId);

    // Verify faculty is assigned to this course
    const assignment = await prisma.courseFaculty.findFirst({
      where: {
        courseId,
        facultyId
      }
    });

    if (!assignment) {
      return res.status(403).json({ 
        success: false, 
        message: 'You are not assigned to this course' 
      });
    }

    const clos = await prisma.clo.findMany({
      where: {
        courseId,
        isActive: true
      },
      select: {
        id: true,
        code: true,
        statement: true,
        bloomLevel: true,
        attainmentThreshold: true,
        order: true
      },
      orderBy: {
        order: 'asc'
      }
    });

    res.status(200).json({
      success: true,
      data: clos,
      count: clos.length
    });

  } catch (error) {
    console.error('Error fetching course CLOs:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching course CLOs',
      error: error.message 
    });
  }
};

module.exports = {
  mapClosToAssessment,
  getAssessmentClos,
  getCourseClos
};