const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper function to get faculty ID from user ID
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

// Create new assessment
const createAssessment = async (req, res) => {
  console.log('[DEBUG] === START createAssessment ===');
  console.log('[DEBUG] Request body:', JSON.stringify(req.body, null, 2));
  console.log('[DEBUG] User from request:', req.user);
  
  try {
    const {
      courseId,
      title,
      description,
      maxMarks,
      weightage,
      type,
      mode,
      subType,
      scheduledDate,
      submissionDeadline,
      semester,
      year
    } = req.body;

    console.log('[DEBUG] User ID from request:', req.user.id);
    
    // Get faculty ID from user ID
    console.log('[DEBUG] Calling getFacultyId...');
    const facultyId = await getFacultyId(req.user.id);
    console.log('[DEBUG] Resolved faculty ID:', facultyId);

    // 1. Validate faculty is assigned to this course
    console.log('[DEBUG] Checking course assignment for courseId:', courseId, 'facultyId:', facultyId, 'semester:', semester, 'year:', year);
    const courseAssignment = await prisma.courseFaculty.findFirst({
      where: {
        courseId,
        facultyId,
        semester,
        year
      }
    });
    console.log('[DEBUG] Course assignment result:', courseAssignment);

    if (!courseAssignment) {
      console.log('[DEBUG] Faculty not assigned to course. Returning 403.');
      return res.status(403).json({ 
        success: false, 
        message: 'You are not assigned to this course for the given semester/year' 
      });
    }

    // 2. Get course details for validation
    console.log('[DEBUG] Fetching course details for courseId:', courseId);
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { credits: true }
    });
    console.log('[DEBUG] Course details:', course);

    if (!course) {
      console.log('[DEBUG] Course not found. Returning 404.');
      return res.status(404).json({ 
        success: false, 
        message: 'Course not found' 
      });
    }

    // 3. Validate total marks don't exceed course max marks (credits × 25)
    console.log('[DEBUG] Calculating total marks used for course...');
    const totalMarksUsed = await prisma.assessment.aggregate({
      where: {
        courseId,
        semester,
        year,
        isActive: true
      },
      _sum: {
        maxMarks: true
      }
    });
    console.log('[DEBUG] Total marks used aggregation result:', totalMarksUsed);

    const maxCourseMarks = course.credits * 25;
    const currentTotal = totalMarksUsed._sum.maxMarks || 0;
    
    console.log('[DEBUG] maxCourseMarks:', maxCourseMarks, 'currentTotal:', currentTotal, 'maxMarks to add:', maxMarks);
    
    if (currentTotal + maxMarks > maxCourseMarks) {
      console.log('[DEBUG] Marks exceed limit. Returning 400.');
      return res.status(400).json({
        success: false,
        message: `Cannot create assessment. Total marks would exceed ${maxCourseMarks}. Currently using ${currentTotal} marks.`,
        maxCourseMarks,
        currentTotal,
        remaining: maxCourseMarks - currentTotal
      });
    }

    // 4. Validate only one practical assessment for courses with practical component
    if (type === 'practical') {
      console.log('[DEBUG] Checking for existing practical assessment...');
      const existingPractical = await prisma.assessment.findFirst({
        where: {
          courseId,
          semester,
          year,
          type: 'practical',
          isActive: true
        }
      });
      console.log('[DEBUG] Existing practical assessment:', existingPractical);

      if (existingPractical) {
        console.log('[DEBUG] Practical assessment already exists. Returning 400.');
        return res.status(400).json({
          success: false,
          message: 'This course already has a practical assessment. Only one practical assessment is allowed per course.'
        });
      }
    }

    // 5. Create assessment
    console.log('[DEBUG] Creating assessment with data:', {
      courseId,
      facultyId,
      semester,
      year,
      title,
      maxMarks: parseFloat(maxMarks),
      weightage: parseFloat(weightage),
      type,
      mode,
      subType
    });
    
    const assessment = await prisma.assessment.create({
      data: {
        courseId,
        facultyId,
        semester,
        year,
        title,
        description,
        maxMarks: parseFloat(maxMarks),
        weightage: parseFloat(weightage),
        type,
        mode,
        subType,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        submissionDeadline: submissionDeadline ? new Date(submissionDeadline) : null
      },
      include: {
        course: {
          select: {
            code: true,
            name: true,
            credits: true
          }
        }
      }
    });
    console.log('[DEBUG] Assessment created successfully:', assessment);

    console.log('[DEBUG] === END createAssessment === SUCCESS');
    res.status(201).json({
      success: true,
      message: 'Assessment created successfully',
      data: assessment,
      marksSummary: {
        maxCourseMarks,
        currentTotal: currentTotal + maxMarks,
        remaining: maxCourseMarks - (currentTotal + maxMarks)
      }
    });

  } catch (error) {
    console.error('[DEBUG] === END createAssessment === ERROR');
    console.error('[DEBUG] Error creating assessment:', error);
    console.error('[DEBUG] Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Error creating assessment',
      error: error.message 
    });
  }
};

// Get assessments for a course
// Update the getCourseAssessments function to be more specific about the error

const getCourseAssessments = async (req, res) => {
  try {
    const { courseId } = req.params;
    const { semester, year } = req.query;
    const facultyId = await getFacultyId(req.user.id);


    // const courseAssignment = await prisma.courseFaculty.findFirst({
    //   where: {
    //     courseId,
    //     facultyId,
    //     ...(semester && { semester: parseInt(semester) }),
    //     ...(year && { year: parseInt(year) })
    //   }
    // });

    // if (!courseAssignment) {
    //   return res.status(403).json({ 
    //     success: false, 
    //     message: 'You are not assigned to this course for the given semester/year'
    //   });
    // }

 
    const assessments = await prisma.assessment.findMany({
      where: {
        courseId,
        isActive: true,
        ...(semester && { semester: parseInt(semester) }),
        ...(year && { year: parseInt(year) })
      },
      include: {
        faculty: {
          select: {
            id: true,
            name: true,
            designation: true
          }
        },
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
        _count: {
          select: {
            marks: true
          }
        }
      },
      orderBy: {
        scheduledDate: 'asc'
      }
    });


    // Get course details for marks summary
    console.log("[DEBUG] Fetching course details...");
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { credits: true, code: true, name: true }
    });


    const totalMarksUsed = await prisma.assessment.aggregate({
      where: {
        courseId,
        isActive: true,
        ...(semester && { semester: parseInt(semester) }),
        ...(year && { year: parseInt(year) })
      },
      _sum: {
        maxMarks: true
      }
    });


    console.log('[DEBUG] === END getCourseAssessments === SUCCESS');
    res.status(200).json({
      success: true,
      data: {
        course,
        assessments,
        marksSummary: {
          maxCourseMarks: course.credits * 25,
          totalUsed: totalMarksUsed._sum.maxMarks || 0,
          remaining: (course.credits * 25) - (totalMarksUsed._sum.maxMarks || 0)
        }
      }
    });

  } catch (error) {
    console.error('[DEBUG] === END getCourseAssessments === ERROR');
    console.error('[DEBUG] Error fetching assessments:', error);
    console.error('[DEBUG] Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching assessments',
      error: error.message 
    });
  }
};

// Also update the getAssessment function to handle the 404 better
const getAssessment = async (req, res) => {
  console.log('[DEBUG] === START getAssessment ===');
  console.log('[DEBUG] Request params:', req.params);
  console.log('[DEBUG] Full URL:', req.originalUrl);
  
  try {
    const { id } = req.params;
    console.log('[DEBUG] Assessment ID:', id);
    
    // Get faculty ID from user ID
    console.log('[DEBUG] Calling getFacultyId...');
    const facultyId = await getFacultyId(req.user.id);
    console.log('[DEBUG] Resolved faculty ID:', facultyId);

    console.log('[DEBUG] Fetching assessment details...');
    const assessment = await prisma.assessment.findUnique({
      where: { 
        id,
        isActive: true 
      },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            name: true,
            credits: true
          }
        },
        faculty: {
          select: {
            name: true,
            designation: true
          }
        },
        assessmentClos: {
          include: {
            clo: {
              select: {
                id: true,
                code: true,
                statement: true,
                bloomLevel: true,
                attainmentThreshold: true
              }
            }
          }
        }
      }
    });
    console.log('[DEBUG] Assessment query result:', assessment);

    if (!assessment) {
      console.log('[DEBUG] Assessment not found. Checking if ID format is correct...');
      console.log('[DEBUG] Looking for any assessment with similar pattern...');
      
      // Try to find any assessment to debug ID format
      const allAssessments = await prisma.assessment.findMany({
        where: { isActive: true },
        take: 5,
        select: { id: true, title: true }
      });
      console.log('[DEBUG] First 5 assessments in DB:', allAssessments);
      
      return res.status(404).json({ 
        success: false, 
        message: 'Assessment not found',
        debug: {
          searchedId: id,
          exampleIds: allAssessments.map(a => a.id)
        }
      });
    }

    // Verify faculty owns this assessment
    console.log('[DEBUG] Verifying ownership. Assessment facultyId:', assessment.facultyId, 'User facultyId:', facultyId);
    if (assessment.facultyId !== facultyId) {
      console.log('[DEBUG] Ownership verification failed. Checking if faculty teaches this course...');
      
      // Check if faculty teaches the course even if they didn't create the assessment
      const teachesCourse = await prisma.courseFaculty.findFirst({
        where: {
          courseId: assessment.courseId,
          facultyId,
          semester: assessment.semester,
          year: assessment.year
        }
      });
      
      if (!teachesCourse) {
        console.log('[DEBUG] Faculty does not teach this course either. Returning 403.');
        return res.status(403).json({ 
          success: false, 
          message: 'You do not have permission to view this assessment' 
        });
      }
      
      console.log('[DEBUG] Faculty teaches course, allowing access...');
    }

    console.log('[DEBUG] === END getAssessment === SUCCESS');
    res.status(200).json({
      success: true,
      data: assessment
    });

  } catch (error) {
    console.error('[DEBUG] === END getAssessment === ERROR');
    console.error('[DEBUG] Error fetching assessment:', error);
    console.error('[DEBUG] Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching assessment',
      error: error.message 
    });
  }
};

// // Get single assessment
// const getAssessment = async (req, res) => {
//   console.log('[DEBUG] === START getAssessment ===');
//   console.log('[DEBUG] Request params:', req.params);
  
//   try {
//     const { id } = req.params;
//     console.log('[DEBUG] Assessment ID:', id);
    
//     // Get faculty ID from user ID
//     console.log('[DEBUG] Calling getFacultyId...');
//     const facultyId = await getFacultyId(req.user.id);
//     console.log('[DEBUG] Resolved faculty ID:', facultyId);

//     console.log('[DEBUG] Fetching assessment details...');
//     const assessment = await prisma.assessment.findUnique({
//       where: { 
//         id,
//         isActive: true 
//       },
//       include: {
//         course: {
//           select: {
//             id: true,
//             code: true,
//             name: true,
//             credits: true
//           }
//         },
//         faculty: {
//           select: {
//             name: true,
//             designation: true
//           }
//         },
//         assessmentClos: {
//           include: {
//             clo: {
//               select: {
//                 id: true,
//                 code: true,
//                 statement: true,
//                 bloomLevel: true,
//                 attainmentThreshold: true
//               }
//             }
//           }
//         }
//       }
//     });
//     console.log('[DEBUG] Assessment query result:', assessment);

//     if (!assessment) {
//       console.log('[DEBUG] Assessment not found. Returning 404.');
//       return res.status(404).json({ 
//         success: false, 
//         message: 'Assessment not found' 
//       });
//     }

//     // Verify faculty owns this assessment
//     console.log('[DEBUG] Verifying ownership. Assessment facultyId:', assessment.facultyId, 'User facultyId:', facultyId);
//     if (assessment.facultyId !== facultyId) {
//       console.log('[DEBUG] Ownership verification failed. Returning 403.');
//       return res.status(403).json({ 
//         success: false, 
//         message: 'You do not have permission to view this assessment' 
//       });
//     }

//     console.log('[DEBUG] === END getAssessment === SUCCESS');
//     res.status(200).json({
//       success: true,
//       data: assessment
//     });

//   } catch (error) {
//     console.error('[DEBUG] === END getAssessment === ERROR');
//     console.error('[DEBUG] Error fetching assessment:', error);
//     res.status(500).json({ 
//       success: false, 
//       message: 'Error fetching assessment',
//       error: error.message 
//     });
//   }
// };

// Update assessment
const updateAssessment = async (req, res) => {
  console.log('[DEBUG] === START updateAssessment ===');
  console.log('[DEBUG] Request params:', req.params);
  console.log('[DEBUG] Request body:', req.body);
  
  try {
    const { id } = req.params;
    const updates = req.body;
    console.log('[DEBUG] Assessment ID to update:', id);
    console.log('[DEBUG] Updates requested:', updates);
    
    // Get faculty ID from user ID
    console.log('[DEBUG] Calling getFacultyId...');
    const facultyId = await getFacultyId(req.user.id);
    console.log('[DEBUG] Resolved faculty ID:', facultyId);

    // Check if assessment exists and belongs to faculty
    console.log('[DEBUG] Checking assessment existence and ownership...');
    const assessment = await prisma.assessment.findUnique({
      where: { 
        id,
        isActive: true 
      }
    });
    console.log('[DEBUG] Found assessment:', assessment);

    if (!assessment) {
      console.log('[DEBUG] Assessment not found. Returning 404.');
      return res.status(404).json({ 
        success: false, 
        message: 'Assessment not found' 
      });
    }

    if (assessment.facultyId !== facultyId) {
      console.log('[DEBUG] Ownership verification failed. Returning 403.');
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to update this assessment' 
      });
    }

    // Check if marks have been entered (prevent updates if marks exist)
    console.log('[DEBUG] Checking if marks exist for assessment...');
    const marksCount = await prisma.mark.count({
      where: { assessmentId: id }
    });
    console.log('[DEBUG] Number of marks found:', marksCount);

    if (marksCount > 0) {
      console.log('[DEBUG] Marks exist, checking allowed updates...');
      // Only allow certain updates if marks exist
      const allowedUpdates = ['description', 'scheduledDate', 'submissionDeadline'];
      const disallowedKeys = Object.keys(updates).filter(key => !allowedUpdates.includes(key));
      
      console.log('[DEBUG] Allowed updates:', allowedUpdates);
      console.log('[DEBUG] Disallowed keys in request:', disallowedKeys);
      
      if (disallowedKeys.length > 0) {
        console.log('[DEBUG] Disallowed updates attempted. Returning 400.');
        return res.status(400).json({
          success: false,
          message: 'Cannot update assessment details after marks have been entered. Only description and dates can be modified.',
          disallowedFields: disallowedKeys
        });
      }
    }

    console.log('[DEBUG] Proceeding with update...');
    const updatedAssessment = await prisma.assessment.update({
      where: { id },
      data: updates,
      include: {
        course: {
          select: {
            code: true,
            name: true
          }
        }
      }
    });
    console.log('[DEBUG] Updated assessment:', updatedAssessment);

    console.log('[DEBUG] === END updateAssessment === SUCCESS');
    res.status(200).json({
      success: true,
      message: 'Assessment updated successfully',
      data: updatedAssessment
    });

  } catch (error) {
    console.error('[DEBUG] === END updateAssessment === ERROR');
    console.error('[DEBUG] Error updating assessment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error updating assessment',
      error: error.message 
    });
  }
};

// Delete assessment (soft delete)
const deleteAssessment = async (req, res) => {
  console.log('[DEBUG] === START deleteAssessment ===');
  console.log('[DEBUG] Request params:', req.params);
  
  try {
    const { id } = req.params;
    console.log('[DEBUG] Assessment ID to delete:', id);
    
    // Get faculty ID from user ID
    console.log('[DEBUG] Calling getFacultyId...');
    const facultyId = await getFacultyId(req.user.id);
    console.log('[DEBUG] Resolved faculty ID:', facultyId);

    // Check if assessment exists and belongs to faculty
    console.log('[DEBUG] Checking assessment existence and ownership...');
    const assessment = await prisma.assessment.findUnique({
      where: { 
        id,
        isActive: true 
      }
    });
    console.log('[DEBUG] Found assessment:', assessment);

    if (!assessment) {
      console.log('[DEBUG] Assessment not found. Returning 404.');
      return res.status(404).json({ 
        success: false, 
        message: 'Assessment not found' 
      });
    }

    if (assessment.facultyId !== facultyId) {
      console.log('[DEBUG] Ownership verification failed. Returning 403.');
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to delete this assessment' 
      });
    }

    // Check if marks have been entered
    console.log('[DEBUG] Checking if marks exist for assessment...');
    const marksCount = await prisma.mark.count({
      where: { assessmentId: id }
    });
    console.log('[DEBUG] Number of marks found:', marksCount);

    if (marksCount > 0) {
      console.log('[DEBUG] Cannot delete - marks exist. Returning 400.');
      return res.status(400).json({
        success: false,
        message: 'Cannot delete assessment after marks have been entered. Please contact admin if this is necessary.'
      });
    }

    // Soft delete
    console.log('[DEBUG] Performing soft delete...');
    await prisma.assessment.update({
      where: { id },
      data: { isActive: false }
    });

    console.log('[DEBUG] === END deleteAssessment === SUCCESS');
    res.status(200).json({
      success: true,
      message: 'Assessment deleted successfully'
    });

  } catch (error) {
    console.error('[DEBUG] === END deleteAssessment === ERROR');
    console.error('[DEBUG] Error deleting assessment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error deleting assessment',
      error: error.message 
    });
  }
};

// Get available marks for course
const getAvailableMarks = async (req, res) => {
  console.log('[DEBUG] === START getAvailableMarks ===');
  console.log('[DEBUG] Request params:', req.params);
  console.log('[DEBUG] Request query:', req.query);
  
  try {
    const { courseId } = req.params;
    const { semester, year } = req.query;
    console.log('[DEBUG] Course ID:', courseId, 'Semester:', semester, 'Year:', year);
    
    // Get faculty ID from user ID
    console.log('[DEBUG] Calling getFacultyId...');
    const facultyId = await getFacultyId(req.user.id);
    console.log('[DEBUG] Resolved faculty ID:', facultyId);

    // Verify faculty assignment
    console.log('[DEBUG] Checking course assignment...');
    const assignment = await prisma.courseFaculty.findFirst({
      where: {
        courseId,
        facultyId,
        ...(semester && { semester: parseInt(semester) }),
        ...(year && { year: parseInt(year) })
      }
    });
    console.log('[DEBUG] Assignment result:', assignment);

    if (!assignment) {
      console.log('[DEBUG] Faculty not assigned to course. Returning 403.');
      return res.status(403).json({ 
        success: false, 
        message: 'You are not assigned to this course' 
      });
    }

    console.log('[DEBUG] Fetching course details...');
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      select: { credits: true, code: true, name: true }
    });
    console.log('[DEBUG] Course details:', course);

    if (!course) {
      console.log('[DEBUG] Course not found. Returning 404.');
      return res.status(404).json({ 
        success: false, 
        message: 'Course not found' 
      });
    }

    console.log('[DEBUG] Calculating total marks used...');
    const totalMarksUsed = await prisma.assessment.aggregate({
      where: {
        courseId,
        isActive: true,
        ...(semester && { semester: parseInt(semester) }),
        ...(year && { year: parseInt(year) })
      },
      _sum: {
        maxMarks: true
      }
    });
    console.log('[DEBUG] Total marks used aggregation:', totalMarksUsed);

    const maxCourseMarks = course.credits * 25;
    const currentTotal = totalMarksUsed._sum.maxMarks || 0;
    console.log('[DEBUG] maxCourseMarks:', maxCourseMarks, 'currentTotal:', currentTotal);

    console.log('[DEBUG] === END getAvailableMarks === SUCCESS');
    res.status(200).json({
      success: true,
      data: {
        course: {
          id: courseId,
          code: course.code,
          name: course.name,
          credits: course.credits
        },
        marksSummary: {
          maxCourseMarks,
          currentTotal,
          remaining: maxCourseMarks - currentTotal,
          percentageUsed: ((currentTotal / maxCourseMarks) * 100).toFixed(2)
        }
      }
    });

  } catch (error) {
    console.error('[DEBUG] === END getAvailableMarks === ERROR');
    console.error('[DEBUG] Error fetching available marks:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching available marks',
      error: error.message 
    });
  }
};
// Finalize marks for an assessment
const finalizeAssessmentMarks = async (req, res) => {
  console.log('[DEBUG] === START finalizeAssessmentMarks ===');
  console.log('[DEBUG] Request params:', req.params);
  console.log('[DEBUG] User from request:', req.user);
  
  try {
    const { id } = req.params;
    console.log('[DEBUG] Assessment ID:', id);
    
    // Get faculty ID from user ID
    console.log('[DEBUG] Calling getFacultyId...');
    const facultyId = await getFacultyId(req.user.id);
    console.log('[DEBUG] Resolved faculty ID:', facultyId);

    // Check if assessment exists
    console.log('[DEBUG] Fetching assessment...');
    const assessment = await prisma.assessment.findUnique({
      where: { 
        id,
        isActive: true 
      },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            name: true
          }
        }
      }
    });
    console.log('[DEBUG] Assessment found:', assessment);

    if (!assessment) {
      console.log('[DEBUG] Assessment not found. Returning 404.');
      return res.status(404).json({ 
        success: false, 
        message: 'Assessment not found' 
      });
    }

    // Check if marks are already finalized
    if (assessment.isMarksFinalized) {
      console.log('[DEBUG] Marks already finalized. Returning 400.');
      return res.status(400).json({
        success: false,
        message: 'Marks are already finalized for this assessment',
        finalizedAt: assessment.marksFinalizedAt,
        finalizedBy: assessment.marksFinalizedById
      });
    }


    // Optional: Check if any marks exceed max marks
    console.log('[DEBUG] Checking for invalid marks...');
    const invalidMarks = await prisma.mark.findMany({
      where: {
        assessmentId: id,
        marksObtained: {
          gt: assessment.maxMarks
        }
      },
      select: {
        studentId: true,
        marksObtained: true
      }
    });
    console.log('[DEBUG] Invalid marks found:', invalidMarks);

    if (invalidMarks.length > 0) {
      console.log('[DEBUG] Some marks exceed max marks. Returning 400.');
      return res.status(400).json({
        success: false,
        message: 'Cannot finalize marks. Some marks exceed the maximum allowed.',
        maxMarks: assessment.maxMarks,
        invalidMarks,
        count: invalidMarks.length
      });
    }

    // Finalize the marks
    console.log('[DEBUG] Proceeding with finalization...');
    const currentTime = new Date();
    
    const updatedAssessment = await prisma.assessment.update({
      where: { id },
      data: {
        isMarksFinalized: true,
        marksFinalizedAt: currentTime,
        marksFinalizedById: facultyId
      },
      include: {
        course: {
          select: {
            code: true,
            name: true
          }
        },
        marksFinalizedBy: {
          select: {
            id: true,
            name: true,
            designation: true
          }
        }
      }
    });
    console.log('[DEBUG] Assessment updated successfully:', updatedAssessment);

    // Optional: Log the finalization event
    console.log('[DEBUG] Creating finalization log...');
    try {
      // You could create an audit log here if you have a logging system
      console.log('[AUDIT] Marks finalized:', {
        assessmentId: id,
        assessmentTitle: assessment.title,
        courseCode: assessment.course.code,
        finalizedBy: facultyId,
        finalizedAt: currentTime,
        // marksCount: marksCount,
        // totalStudents: enrolledStudents
      });
    } catch (logError) {
      console.error('[DEBUG] Error creating audit log:', logError);
      // Don't fail the whole request if logging fails
    }

    console.log('[DEBUG] === END finalizeAssessmentMarks === SUCCESS');
    res.status(200).json({
      success: true,
      message: 'Marks finalized successfully',
      data: {
        assessment: {
          id: updatedAssessment.id,
          title: updatedAssessment.title,
          isMarksFinalized: updatedAssessment.isMarksFinalized,
          marksFinalizedAt: updatedAssessment.marksFinalizedAt,
          marksFinalizedBy: updatedAssessment.marksFinalizedBy
        },
        statistics: {
          // totalStudents: enrolledStudents,
          // marksEntered: marksCount,
          // missingMarks: enrolledStudents - marksCount
        }
        ,
        finalizedBy: {
          id: facultyId,
          name: req.user.name || 'Unknown'
        }
      }
    });

  } catch (error) {
    console.error('[DEBUG] === END finalizeAssessmentMarks === ERROR');
    console.error('[DEBUG] Error finalizing marks:', error);
    console.error('[DEBUG] Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Error finalizing marks',
      error: error.message 
    });
  }
};



// Check finalization status
const getFinalizationStatus = async (req, res) => {
  console.log('[DEBUG] === START getFinalizationStatus ===');
  console.log('[DEBUG] Request params:', req.params);
  
  try {
    const { id } = req.params;
    console.log('[DEBUG] Assessment ID:', id);
    
    // Get faculty ID from user ID
    console.log('[DEBUG] Calling getFacultyId...');
    const facultyId = await getFacultyId(req.user.id);
    console.log('[DEBUG] Resolved faculty ID:', facultyId);

    // Check if assessment exists
    console.log('[DEBUG] Fetching assessment...');
    const assessment = await prisma.assessment.findUnique({
      where: { 
        id,
        isActive: true 
      },
      include: {
        marksFinalizedBy: {
          select: {
            id: true,
            name: true,
            designation: true
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
    console.log('[DEBUG] Assessment found:', assessment);

    if (!assessment) {
      console.log('[DEBUG] Assessment not found. Returning 404.');
      return res.status(404).json({ 
        success: false, 
        message: 'Assessment not found' 
      });
    }

    // Check permission (faculty should own or teach the course)
    console.log('[DEBUG] Checking permissions...');
    const teachesCourse = await prisma.courseFaculty.findFirst({
      where: {
        courseId: assessment.courseId,
        facultyId,
        semester: assessment.semester,
        year: assessment.year
      }
    });
    
    if (!teachesCourse && assessment.facultyId !== facultyId) {
      console.log('[DEBUG] Permission denied. Returning 403.');
      return res.status(403).json({ 
        success: false, 
        message: 'You do not have permission to view this assessment' 
      });
    }

    // Get marks statistics
    // console.log('[DEBUG] Getting marks statistics...');
    // const enrolledStudents = await prisma.courseEnrollment.count({
    //   where: {
    //     courseId: assessment.courseId,
    //     semester: assessment.semester,
    //     year: assessment.year,
    //     status: 'ENROLLED'
    //   }
    // });

    // const marksCount = await prisma.mark.count({
    //   where: { assessmentId: id }
    // });

    console.log('[DEBUG] === END getFinalizationStatus === SUCCESS');
    res.status(200).json({
      success: true,
      data: {
        assessment: {
          id: assessment.id,
          title: assessment.title,
          courseCode: assessment.course.code,
          isMarksFinalized: assessment.isMarksFinalized,
          marksFinalizedAt: assessment.marksFinalizedAt,
          marksFinalizedBy: assessment.marksFinalizedBy
        },
        // statistics: {
        //   totalStudents: enrolledStudents,
        //   marksEntered: marksCount,
        //   missingMarks: enrolledStudents - marksCount,
        //   percentageEntered: ((marksCount / enrolledStudents) * 100).toFixed(2)
        // }
        
        canFinalize: assessment.facultyId === facultyId && !assessment.isMarksFinalized,
        canUnfinalize: assessment.facultyId === facultyId && 
                      assessment.isMarksFinalized && 
                      assessment.marksFinalizedById === facultyId
      }
    });

  } catch (error) {
    console.error('[DEBUG] === END getFinalizationStatus === ERROR');
    console.error('[DEBUG] Error getting finalization status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error getting finalization status',
      error: error.message 
    });
  }
};

module.exports = {
  createAssessment,
  getCourseAssessments,
  getAssessment,
  updateAssessment,
  deleteAssessment,
  getAvailableMarks,
  finalizeAssessmentMarks,
  getFinalizationStatus
};

