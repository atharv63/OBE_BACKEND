const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Check if course already has practical assessment
const checkPracticalAssessment = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { semester, year } = req.query;
    const facultyId = req.user.id;

    // Verify faculty assignment
    const assignment = await prisma.courseFaculty.findFirst({
      where: {
        courseId,
        facultyId,
        ...(semester && { semester: parseInt(semester) }),
        ...(year && { year: parseInt(year) })
      }
    });

    if (!assignment) {
      return res.status(403).json({ 
        success: false, 
        message: 'You are not assigned to this course' 
      });
    }

    const existingPractical = await prisma.assessment.findFirst({
      where: {
        courseId,
        type: 'BOTH',
        isActive: true,
        ...(semester && { semester: parseInt(semester) }),
        ...(year && { year: parseInt(year) })
      },
      select: {
        id: true,
        title: true,
        maxMarks: true
      }
    });

    res.status(200).json({
      success: true,
      data: {
        hasPractical: !!existingPractical,
        existingAssessment: existingPractical
      }
    });

  } catch (error) {
    console.error('Error checking practical assessment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error checking practical assessment',
      error: error.message 
    });
  }
};

// Validate assessment creation
const validateAssessment = async (req, res) => {
  try {
    const { courseId, type, maxMarks, semester, year } = req.body;
    const facultyId = req.user.id;

    // 1. Verify faculty assignment
    const assignment = await prisma.courseFaculty.findFirst({
      where: {
        courseId,
        facultyId,
        semester: parseInt(semester),
        year: parseInt(year)
      }
    });

    if (!assignment) {
      return res.status(403).json({ 
        success: false, 
        message: 'You are not assigned to this course' 
      });
    }

    // 2. Get course details
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { credits: true }
    });

    if (!course) {
      return res.status(404).json({ 
        success: false, 
        message: 'Course not found' 
      });
    }

    // 3. Calculate total marks used
    const totalMarksUsed = await prisma.assessment.aggregate({
      where: {
        courseId,
        semester: parseInt(semester),
        year: parseInt(year),
        isActive: true
      },
      _sum: {
        maxMarks: true
      }
    });

    const maxCourseMarks = course.credits * 25;
    const currentTotal = totalMarksUsed._sum.maxMarks || 0;
    const proposedTotal = currentTotal + parseFloat(maxMarks);

    // 4. Validate practical assessment limit
    let practicalValidation = {};
    if (type === 'practical') {
      const existingPractical = await prisma.assessment.findFirst({
        where: {
          courseId,
          type: 'practical',
          semester: parseInt(semester),
          year: parseInt(year),
          isActive: true
        }
      });

      practicalValidation = {
        allowed: !existingPractical,
        message: existingPractical ? 
          'Course already has a practical assessment' : 
          'Can create practical assessment',
        existingPractical
      };
    }

    // 5. Prepare validation result
    const validation = {
      marksValidation: {
        allowed: proposedTotal <= maxCourseMarks,
        maxCourseMarks,
        currentTotal,
        proposedTotal,
        remaining: maxCourseMarks - currentTotal,
        message: proposedTotal <= maxCourseMarks ?
          `Can create assessment (${maxMarks} marks). ${maxCourseMarks - proposedTotal} marks remaining.` :
          `Cannot create assessment. Would exceed max marks by ${proposedTotal - maxCourseMarks}.`
      },
      practicalValidation,
      courseCredits: course.credits,
      recommendedPracticalMarks: course.credits === 4 ? 25 :  // 1 credit = 25 marks
                                course.credits === 3 ? 25 :  // 1 credit = 25 marks
                                0
    };

    validation.allowed = validation.marksValidation.allowed && 
                        (type !== 'practical' || practicalValidation.allowed);

    res.status(200).json({
      success: true,
      data: validation
    });

  } catch (error) {
    console.error('Error validating assessment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error validating assessment',
      error: error.message 
    });
  }
};

// Validate marks entry
const validateMarksEntry = async (req, res) => {
  try {
    const { assessmentId, studentId, cloId, marksObtained } = req.body;
    const facultyId = req.user.id;

    // 1. Verify assessment belongs to faculty
    const assessment = await prisma.assessment.findUnique({
      where: { 
        id: assessmentId,
        isActive: true 
      }
    });

    if (!assessment || assessment.facultyId !== facultyId) {
      return res.status(403).json({ 
        success: false, 
        message: 'Invalid assessment or no permission' 
      });
    }

    // 2. Get CLO allocation
    const cloAllocation = await prisma.assessmentClo.findUnique({
      where: {
        assessmentId_cloId: {
          assessmentId,
          cloId
        }
      }
    });

    if (!cloAllocation) {
      return res.status(400).json({
        success: false,
        message: 'CLO is not allocated to this assessment'
      });
    }

    // 3. Validate marks
    const validation = {
      allowed: marksObtained <= cloAllocation.marksAllocated && marksObtained >= 0,
      maxMarks: cloAllocation.marksAllocated,
      enteredMarks: parseFloat(marksObtained),
      message: marksObtained <= cloAllocation.marksAllocated ?
        `Marks are within allowed range (0-${cloAllocation.marksAllocated})` :
        `Marks exceed maximum allowed (${cloAllocation.marksAllocated})`
    };

    res.status(200).json({
      success: true,
      data: validation
    });

  } catch (error) {
    console.error('Error validating marks entry:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error validating marks entry',
      error: error.message 
    });
  }
};

module.exports = {
  checkPracticalAssessment,
  validateAssessment,
  validateMarksEntry
};