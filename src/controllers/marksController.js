const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Enter marks in bulk (multiple students for an assessment)
const enterBulkMarks = async (req, res) => {
  try {
    const { assessmentId } = req.params;
    const { marksEntries } = req.body; // Array of { studentId, cloId, marksObtained }

    // 1. Verify assessment exists
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
        },
        assessmentClos: {
          select: {
            cloId: true,
            marksAllocated: true
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

    // 2. Get students enrolled in the course for validation
    const enrolledStudents = await prisma.studentCourseEnrollment.findMany({
      where: {
        courseId: assessment.course.id,
        semester: assessment.semester,
        year: assessment.year,
        status: 'ENROLLED'
      },
      select: {
        studentId: true,
        student: {
          select: {
            id: true,
            rollNumber: true,
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        }
      }
    });

    const enrolledStudentIds = enrolledStudents.map(es => es.studentId);

    // 3. Validate each marks entry
    const errors = [];
    const validEntries = [];
    
    for (const entry of marksEntries) {
      // Check if student is enrolled
      if (!enrolledStudentIds.includes(entry.studentId)) {
        errors.push({
          studentId: entry.studentId,
          error: 'Student is not enrolled in this course for the given semester/year'
        });
        continue;
      }

      // Check if CLO is allocated to this assessment
      const cloAllocation = assessment.assessmentClos.find(ac => ac.cloId === entry.cloId);
      if (!cloAllocation) {
        errors.push({
          studentId: entry.studentId,
          cloId: entry.cloId,
          error: 'CLO is not allocated to this assessment'
        });
        continue;
      }

      // Check marks don't exceed allocated marks
      if (entry.marksObtained > cloAllocation.marksAllocated) {
        errors.push({
          studentId: entry.studentId,
          cloId: entry.cloId,
          error: `Marks obtained (${entry.marksObtained}) exceeds allocated marks (${cloAllocation.marksAllocated})`
        });
        continue;
      }

      // Check marks are not negative
      if (entry.marksObtained < 0) {
        errors.push({
          studentId: entry.studentId,
          cloId: entry.cloId,
          error: 'Marks cannot be negative'
        });
        continue;
      }

      validEntries.push({
        studentId: entry.studentId,
        assessmentId,
        cloId: entry.cloId,
        marksObtained: parseFloat(entry.marksObtained),
        enteredById: req.user?.id || null,
      });
    }

    if (errors.length > 0 && validEntries.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'All marks entries have errors',
        errors
      });
    }

    // 4. Enter marks in transaction
    const results = await prisma.$transaction(async (tx) => {
      const upsertPromises = validEntries.map(entry =>
        tx.mark.upsert({
          where: {
            studentId_assessmentId_cloId: {
              studentId: entry.studentId,
              assessmentId: entry.assessmentId,
              cloId: entry.cloId
            }
          },
          update: {
            marksObtained: entry.marksObtained,
            enteredById: entry.enteredById,
            updatedAt: new Date()
          },
          create: entry
        })
      );

      return Promise.all(upsertPromises);
    });

    res.status(200).json({
      success: true,
      message: `Successfully entered marks for ${results.length} entries`,
      data: {
        successful: results.length,
        failed: errors.length,
        errors: errors.length > 0 ? errors : undefined,
        summary: {
          totalEntries: marksEntries.length,
          processed: results.length + errors.length
        }
      }
    });

  } catch (error) {
    console.error('Error entering bulk marks:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error entering marks',
      error: error.message 
    });
  }
};

// Get assessment marks
const getAssessmentMarks = async (req, res) => {
  try {
    const { assessmentId } = req.params;

    // 1. Verify assessment exists
    const assessment = await prisma.assessment.findUnique({
      where: { 
        id: assessmentId,
        isActive: true 
      },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            name: true
          }
        },
        assessmentClos: {
          include: {
            clo: {
              select: {
                id: true,
                code: true,
                statement: true,
              }
            }
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

    // 2. Get students enrolled in the course
    const enrolledStudents = await prisma.studentCourseEnrollment.findMany({
      where: {
        courseId: assessment.course.id,
        semester: assessment.semester,
        year: assessment.year,
        status: 'ENROLLED'
      },
      select: {
        status: true,
        student: {
          select: {
            id: true,
            rollNumber: true,
            admissionYear: true,
            currentSemester: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        student: {
          rollNumber: 'asc'
        }
      }
    });

    // 3. Get existing marks
    const existingMarks = await prisma.mark.findMany({
      where: { assessmentId },
      select: {
        studentId: true,
        cloId: true,
        marksObtained: true
      }
    });

    // 4. Format data for frontend
    const studentsData = enrolledStudents.map(enrollment => {
      const student = enrollment.student;
      const marksByClo = {};
      
      assessment.assessmentClos.forEach(ac => {
        const existingMark = existingMarks.find(
          m => m.studentId === student.id && m.cloId === ac.cloId
        );
        marksByClo[ac.cloId] = {
          marksObtained: existingMark ? existingMark.marksObtained : 0,
          marksAllocated: ac.marksAllocated,
          cloCode: ac.clo.code
        };
      });

      // Calculate total
      const totalObtained = Object.values(marksByClo).reduce(
        (sum, m) => sum + m.marksObtained, 0
      );
      const totalAllocated = assessment.assessmentClos.reduce(
        (sum, ac) => sum + ac.marksAllocated, 0
      );

      return {
        studentId: student.id,
        rollNumber: student.rollNumber,
        name: student.user?.name || 'N/A',
        email: student.user?.email,
        admissionYear: student.admissionYear,
        currentSemester: student.currentSemester,
        enrollmentStatus: enrollment.status,
        marksByClo,
        total: {
          obtained: totalObtained,
          allocated: totalAllocated,
          percentage: totalAllocated > 0 ? ((totalObtained / totalAllocated) * 100).toFixed(2) : 0
        }
      };
    });

    // 5. Calculate assessment statistics
    const assessmentStats = {
      totalStudents: studentsData.length,
      studentsWithMarks: studentsData.filter(s => 
        Object.values(s.marksByClo).some(m => m.marksObtained > 0)
      ).length,
      averageMarks: studentsData.length > 0 ? 
        (studentsData.reduce((sum, s) => sum + s.total.obtained, 0) / studentsData.length).toFixed(2) : 0,
      highestMarks: Math.max(...studentsData.map(s => s.total.obtained)),
      lowestMarks: Math.min(...studentsData.map(s => s.total.obtained))
    };

    // 6. Format CLOs data for frontend
    const closData = assessment.assessmentClos.map(ac => ({
      id: ac.cloId,
      code: ac.clo.code,
      statement: ac.clo.statement,
      marksAllocated: ac.marksAllocated,
      weightage: ac.weightage,
      bloomLevel: ac.bloomLevel || ac.clo.bloomLevel
    }));

    res.status(200).json({
      success: true,
      data: {
        assessment: {
          id: assessment.id,
          title: assessment.title,
          maxMarks: assessment.maxMarks,
          type: assessment.type,
          course: assessment.course
        },
        clos: closData,
        students: studentsData,
        statistics: assessmentStats,
        marksSummary: {
          totalPossible: assessment.maxMarks * studentsData.length,
          totalObtained: studentsData.reduce((sum, s) => sum + s.total.obtained, 0),
          completionPercentage: ((assessmentStats.studentsWithMarks / studentsData.length) * 100).toFixed(2)
        }
      }
    });

  } catch (error) {
    console.error('Error fetching assessment marks:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching assessment marks',
      error: error.message 
    });
  }
};

// Get students for a course
const getCourseStudents = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { semester, year } = req.query;

    // 1. Get course details
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: {
        code: true,
        name: true,
        credits: true,
        semester: true
      }
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // 2. Get enrolled students
    const enrolledStudents = await prisma.studentCourseEnrollment.findMany({
      where: {
        courseId,
        status: 'ENROLLED',
        ...(semester && { semester: parseInt(semester) }),
        ...(year && { year: parseInt(year) })
      },
      select: {
        status: true,
        student: {
          select: {
            id: true,
            rollNumber: true,
            admissionYear: true,
            currentSemester: true,
            user: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: {
        student: {
          rollNumber: 'asc'
        }
      }
    });

    // Format response
    const students = enrolledStudents.map(enrollment => ({
      id: enrollment.student.id,
      rollNumber: enrollment.student.rollNumber,
      name: enrollment.student.user?.name || 'N/A',
      email: enrollment.student.user?.email,
      admissionYear: enrollment.student.admissionYear,
      currentSemester: enrollment.student.currentSemester,
      enrollmentStatus: enrollment.status,
      userId: enrollment.student.user?.id
    }));

    // 3. Send response
    res.status(200).json({
      success: true,
      data: {
        course: {
          id: courseId,
          code: course.code,
          name: course.name,
          credits: course.credits,
          semester: course.semester
        },
        students,
        count: students.length,
        filters: {
          semester: semester || 'current',
          year: year || 'current'
        }
      }
    });

  } catch (error) {
    console.error('Error fetching course students:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching course students',
      error: error.message 
    });
  }
};

// Get student's marks for an assessment
const getStudentMarks = async (req, res) => {
  try {
    const { assessmentId, studentId } = req.params;

    // Verify assessment exists
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

    // Get student details
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: {
        id: true,
        rollNumber: true,
        admissionYear: true,
        currentSemester: true,
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: 'Student not found' 
      });
    }

    // Get assessment CLOs
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

    // Get marks for this student
    const marks = await prisma.mark.findMany({
      where: {
        assessmentId,
        studentId
      }
    });

    // Format response
    const marksData = assessmentClos.map(ac => {
      const mark = marks.find(m => m.cloId === ac.cloId);
      return {
        cloId: ac.cloId,
        cloCode: ac.clo.code,
        cloStatement: ac.clo.statement,
        bloomLevel: ac.bloomLevel,
        marksAllocated: ac.marksAllocated,
        marksObtained: mark ? mark.marksObtained : 0,
        enteredAt: mark ? mark.enteredAt : null
      };
    });

    const totalObtained = marksData.reduce((sum, m) => sum + m.marksObtained, 0);
    const totalAllocated = marksData.reduce((sum, m) => sum + m.marksAllocated, 0);

    res.status(200).json({
      success: true,
      data: {
        assessment: {
          id: assessment.id,
          title: assessment.title,
          maxMarks: assessment.maxMarks
        },
        student: {
          id: student.id,
          rollNumber: student.rollNumber,
          name: student.user?.name || 'N/A',
          email: student.user?.email,
          admissionYear: student.admissionYear,
          currentSemester: student.currentSemester
        },
        marks: marksData,
        summary: {
          totalObtained,
          totalAllocated,
          percentage: totalAllocated > 0 ? ((totalObtained / totalAllocated) * 100).toFixed(2) : 0
        }
      }
    });

  } catch (error) {
    console.error('Error fetching student marks:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching student marks',
      error: error.message 
    });
  }
};

module.exports = {
  enterBulkMarks,
  getAssessmentMarks,
  getCourseStudents,
  getStudentMarks
};