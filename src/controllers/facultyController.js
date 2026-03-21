// backend/src/controllers/facultyController.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Get faculty profile and assignments
module.exports.getFacultyProfile = async (req, res) => {
  try {
    const faculty = await prisma.faculty.findFirst({
      where: { 
        userId: req.user.id,
        isActive: true 
      },
      include: {
        department: {
          select: { name: true, code: true }
        },
        user: {
          select: { email: true, name: true }
        },
        courseAssignments: {
          include: {
            course: {
              select: { 
                code: true, 
                name: true,
                credits: true,
                semester: true,
                type: true
              }
            }
          },
          orderBy: [
            { year: 'desc' },
            { semester: 'asc' }
          ]
        }
      }
    });

    if (!faculty) {
      return res.status(404).json({ 
        error: "Faculty profile not found",
        message: "Please contact administrator to create your faculty profile"
      });
    }

    res.json(faculty);
  } catch (error) {
    console.error("getFacultyProfile error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get current semester assignments
module.exports.getCurrentAssignments = async (req, res) => {
  try {
    const faculty = await prisma.faculty.findFirst({
      where: { 
        userId: req.user.id,
        isActive: true 
      }
    });

    if (!faculty) {
      return res.status(404).json({ error: "Faculty not found" });
    }

    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;
    const currentSemester = currentMonth >= 1 && currentMonth <= 6 ? 2 : 1;

    const assignments = await prisma.courseFaculty.findMany({
      where: {
        facultyId: faculty.id,
        year: currentYear,
        semester: currentSemester
      },
      include: {
        course: {
          select: { 
            code: true, 
            name: true,
            credits: true,
            type: true,
            description: true,
            clos: {
              where: { isActive: true },
              select: { code: true, statement: true }
            }
          }
        }
      }
    });

    res.json({
      faculty: {
        name: faculty.name,
        designation: faculty.designation
      },
      currentYear,
      currentSemester,
      assignments
    });
  } catch (error) {
    console.error("getCurrentAssignments error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get faculty dashboard statistics
module.exports.getDashboardStats = async (req, res) => {
  try {
    console.log('📊 getDashboardStats called for user:', req.user.id);
    
    // 1. Get faculty
    const faculty = await prisma.faculty.findFirst({
      where: { 
        userId: req.user.id,
        isActive: true 
      }
    });

    if (!faculty) {
      console.log('❌ Faculty not found for user:', req.user.id);
      return res.status(404).json({ error: "Faculty not found" });
    }

    console.log('✅ Faculty found:', faculty.name);
    
    // 2. DEBUG: First, check ALL assignments to see what exists
    const allAssignments = await prisma.courseFaculty.findMany({
      where: {
        facultyId: faculty.id
      },
      select: {
        year: true,
        semester: true,
        course: {
          select: {
            code: true,
            name: true
          }
        }
      },
      orderBy: [
        { year: 'desc' },
        { semester: 'desc' }
      ]
    });

    console.log('📋 ALL assignments found:', allAssignments.length);
    console.log('Assignment details:', allAssignments.map(a => ({
      course: a.course.code,
      year: a.year,
      semester: a.semester
    })));

    // 3. Determine which academic year to use
    // If there are assignments, use the most recent year
    // Otherwise use current calendar year
    let displayYear;
    if (allAssignments.length > 0) {
      // Get unique years from assignments
      const assignmentYears = [...new Set(allAssignments.map(a => a.year))];
      displayYear = Math.max(...assignmentYears); // Most recent year
      console.log('🎯 Using most recent assignment year:', displayYear);
    } else {
      displayYear = new Date().getFullYear();
      console.log('🎯 No assignments found, using current year:', displayYear);
    }

    // 4. Calculate current semester (based on calendar)
    const currentMonth = new Date().getMonth() + 1;
    const displaySemester = currentMonth >= 1 && currentMonth <= 6 ? 2 : 1;
    
    console.log('📅 Display period:', {
      year: displayYear,
      semester: displaySemester,
      month: currentMonth
    });

    // 5. Get assignments for the determined year and semester
    const currentAssignments = await prisma.courseFaculty.count({
      where: {
        facultyId: faculty.id,
        year: displayYear,
        semester: displaySemester
      }
    });

    console.log('📚 Current assignments count:', currentAssignments);

    // 6. Get total assignments
    const totalAssignments = await prisma.courseFaculty.count({
      where: {
        facultyId: faculty.id
      }
    });

    console.log('📚 Total assignments count:', totalAssignments);

    // 7. Get current courses with details
    const currentCourses = await prisma.courseFaculty.findMany({
      where: {
        facultyId: faculty.id,
        year: displayYear,
        semester: displaySemester
      },
      include: {
        course: {
          select: {
            id: true,
            code: true,
            name: true,
            credits: true,
            type: true
          }
        }
      }
    });

    console.log('📖 Current courses found:', currentCourses.length);

    // 8. Get CLOs count for current courses
    let totalCLOs = 0;
    for (const assignment of currentCourses) {
      const cloCount = await prisma.clo.count({
        where: {
          courseId: assignment.courseId,
          isActive: true
        }
      });
      totalCLOs += cloCount;
    }

    console.log('🎯 Total CLOs count:', totalCLOs);

    // 9. Get assignments by semester for the display year
    const assignmentsBySemester = await prisma.courseFaculty.groupBy({
      by: ['semester'],
      where: {
        facultyId: faculty.id,
        year: displayYear
      },
      _count: true,
      orderBy: {
        semester: 'asc'
      }
    });

    console.log('📊 Assignments by semester:', assignmentsBySemester);

    // 10. Prepare response
    res.json({
      stats: {
        currentAssignments,
        totalAssignments,
        totalCourses: currentCourses.length,
        totalCLOs,
        displayYear,  // Using displayYear instead of currentYear
        displaySemester,
        semesterName: displaySemester === 1 ? 'Odd Semester (Jul-Dec)' : 'Even Semester (Jan-Jun)'
      },
      currentCourses: currentCourses.map(assignment => ({
        id: assignment.course.id,
        code: assignment.course.code,
        name: assignment.course.name,
        credits: assignment.course.credits || 0,
        type: assignment.course.type,
        assignmentYear: assignment.year,
        assignmentSemester: assignment.semester
      })),
      assignmentsBySemester: assignmentsBySemester.map(item => ({
        semester: item.semester,
        count: item._count,
        semesterName: item.semester === 1 ? 'Odd' : 'Even'
      })),
      faculty: {
        name: faculty.name,
        designation: faculty.designation,
        departmentId: faculty.departmentId
      },
      debugInfo: {
        totalAssignmentsFound: allAssignments.length,
        allAssignmentYears: [...new Set(allAssignments.map(a => a.year))],
        usingYear: displayYear,
        reason: allAssignments.length > 0 ? 
          'Using most recent year with assignments' : 
          'Using current calendar year (no assignments found)'
      }
    });

  } catch (error) {
    console.error("❌ getDashboardStats error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get all faculty assignments (historical)
module.exports.getAllAssignments = async (req, res) => {
  try {
    const { year, semester } = req.query;
    const faculty = await prisma.faculty.findFirst({
      where: { 
        userId: req.user.id,
        isActive: true 
      }
    });

    if (!faculty) {
      return res.status(404).json({ error: "Faculty not found" });
    }

    const whereClause = {
      facultyId: faculty.id
    };

    if (year) whereClause.year = parseInt(year);
    if (semester) whereClause.semester = parseInt(semester);

    const assignments = await prisma.courseFaculty.findMany({
      where: whereClause,
      include: {
        course: {
          select: {
            id: true,
            code: true,
            name: true,
            credits: true,
            semester: true,
            type: true,
            category: true,
            department: {
              select: {
                name: true,
                code: true
              }
            }
          }
        }
      },
      orderBy: [
        { year: 'desc' },
        { semester: 'desc' }
      ]
    });

    res.json({
      faculty: {
        name: faculty.name,
        designation: faculty.designation
      },
      assignments
    });
  } catch (error) {
    console.error("getAllAssignments error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get faculty department info - FIXED VERSION
module.exports.getDepartmentInfo = async (req, res) => {
  try {
    // First get faculty
    const faculty = await prisma.faculty.findFirst({
      where: { 
        userId: req.user.id,
        isActive: true 
      }
    });

    if (!faculty) {
      return res.status(404).json({ error: "Faculty not found" });
    }

    // Then get department
    const department = await prisma.department.findUnique({
      where: { id: faculty.departmentId },
      select: {
        id: true,
        name: true,
        code: true,
        program: {
          select: {
            name: true,
            code: true
          }
        },
        hod: {
          select: {
            name: true,
            email: true
          }
        },
        faculties: {
          where: {
            isActive: true,
            id: { not: faculty.id }  // ✅ Now faculty.id is defined
          },
          select: {
            id: true,
            name: true,
            designation: true
          },
          take: 10
        }
      }
    });

    if (!department) {
      return res.status(404).json({ error: "Department not found" });
    }

    res.json(department);
  } catch (error) {
    console.error("getDepartmentInfo error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get course details with CLOs
module.exports.getCourseDetails = async (req, res) => {
  try {
    const { courseId } = req.params;
    
    const faculty = await prisma.faculty.findFirst({
      where: { 
        userId: req.user.id,
        isActive: true 
      }
    });

    if (!faculty) {
      return res.status(404).json({ error: "Faculty not found" });
    }

    // Verify faculty is assigned to this course
    const assignment = await prisma.courseFaculty.findFirst({
      where: {
        facultyId: faculty.id,
        courseId: courseId
      }
    });

    if (!assignment) {
      return res.status(403).json({ error: "You are not assigned to this course" });
    }

    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        department: {
          select: {
            name: true,
            code: true
          }
        },
        createdBy: {
          select: {
            name: true,
            email: true
          }
        },
        clos: {
          where: { isActive: true },
          select: {
            id: true,
            code: true,
            statement: true,
            bloomLevel: true,
            attainmentThreshold: true,
            order: true
          },
          orderBy: { order: 'asc' }
        },
        facultyAssignments: {
          where: {
            facultyId: faculty.id
          },
          select: {
            semester: true,
            year: true,
            teachingMethodology: true,
            assessmentMode: true
          },
          orderBy: [
            { year: 'desc' },
            { semester: 'desc' }
          ]
        }
      }
    });

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    res.json(course);
  } catch (error) {
    console.error("getCourseDetails error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Submit performance report to HOD

module.exports.submitReportToHOD = async (req, res) => {
  try {
    const { 
      reportName,
      reportParameters,
      reportType,
      academicYear 
    } = req.body;
    
    console.log('📤 Creating and submitting new report to HOD:', { 
      reportName, 
      userId: req.user.id 
    });

    // Validate required fields
    if (!reportName || !reportParameters || !reportType) {
      return res.status(400).json({ 
        error: "Missing required fields",
        message: "Please provide reportName, reportParameters, and reportType"
      });
    }

    // First get faculty to verify permissions
    const faculty = await prisma.faculty.findFirst({
      where: { 
        userId: req.user.id,
        isActive: true 
      }
    });

    if (!faculty) {
      console.log('❌ Faculty not found for user:', req.user.id);
      return res.status(404).json({ 
        error: "Faculty not found",
        message: "Please contact administrator to create your faculty profile"
      });
    }

    console.log('✅ Faculty found:', faculty.name);

    const courseId = reportParameters.courseId || null;

    const recentReports = await prisma.performanceReport.findMany({
      where: {
        createdById: req.user.id,
        reportType: reportType,
        isSubmittedToHod: true,
        createdAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000) 
        }
      }
    });

    // Manually check for duplicates by comparing reportParameters
    const isDuplicate = recentReports.some(report => {
      const params = report.reportParameters;
      return (
        params.courseId === reportParameters.courseId &&
        params.semester === reportParameters.semester &&
        params.year === reportParameters.year &&
        // For combined reports, check assessmentIds
        (reportType !== 'COMBINED' || 
          JSON.stringify(params.assessmentIds) === JSON.stringify(reportParameters.assessmentIds))
      );
    });

    if (isDuplicate) {
      console.log('⚠️ Duplicate report submission prevented');
      return res.status(409).json({
        error: "Duplicate report",
        message: "You have already submitted this report within the last 24 hours"
      });
    }

    // Create new report with submitted status
    const newReport = await prisma.performanceReport.create({
      data: {
        reportName,
        reportParameters,
        reportType,
        academicYear: academicYear || null,
        courseId,
        createdById: req.user.id,
        isSubmittedToHod: true,
        submittedToHodAt: new Date()
      },
      include: {
        createdByUser: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    console.log('✅ Report created and submitted successfully:', {
      reportId: newReport.id,
      submittedAt: newReport.submittedToHodAt
    });

    // Optional: Create notification for HOD
    try {
      const hod = await prisma.user.findFirst({
        where: {
          departmentId: faculty.departmentId,
          role: 'HOD',
          isActive: true
        },
        select: { id: true, name: true }
      });

      if (hod) {
        console.log('📨 HOD notification would be sent to:', hod.name);
        // You can implement notification creation here
        // await prisma.notification.create({ ... });
      }
    } catch (notificationError) {
      console.error('⚠️ Failed to create HOD notification:', notificationError);
    }

    res.status(201).json({
      success: true,
      message: "Report submitted to HOD successfully",
      report: {
        id: newReport.id,
        reportName: newReport.reportName,
        reportType: newReport.reportType,
        submittedToHodAt: newReport.submittedToHodAt,
        isSubmittedToHod: newReport.isSubmittedToHod,
        reportParameters: newReport.reportParameters
      }
    });

  } catch (error) {
    console.error("❌ submitReportToHOD error:", error);
    res.status(500).json({ 
      error: "Failed to submit report to HOD",
      message: error.message 
    });
  }
};
module.exports.checkReportSubmission = async (req, res) => {
  try {
    const { courseId, semester, year, assessmentIds } = req.query;
    
    console.log('🔍 Checking report submission status:', { courseId, semester, year, assessmentIds });

    // Validate required fields
    if (!courseId || !semester || !year) {
      return res.status(400).json({ 
        error: "Missing required fields",
        message: "Please provide courseId, semester, and year"
      });
    }

    // Parse assessmentIds if provided (could be comma-separated string)
    let assessmentIdsArray = [];
    if (assessmentIds) {
      assessmentIdsArray = assessmentIds.split(',').filter(id => id);
    }

    // Add date filter - check within last 24 hours
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // First, get all recent reports
    const reports = await prisma.performanceReport.findMany({
      where: {
        createdById: req.user.id,
        reportType: assessmentIdsArray.length > 0 ? 'COMBINED' : 'SINGLE',
        isSubmittedToHod: true,
        createdAt: {
          gte: oneDayAgo
        }
      }
    });

    // Manually filter by reportParameters in JavaScript
    const isSubmitted = reports.some(report => {
      const params = report.reportParameters;
      
      // Check if params exists and has the required fields
      if (!params) return false;
      
      // Check basic parameters
      const basicMatch = 
        params.courseId === courseId &&
        params.semester === parseInt(semester) &&
        params.year === parseInt(year);
      
      if (!basicMatch) return false;

      // For combined reports, check assessmentIds
      if (assessmentIdsArray.length > 0) {
        const reportAssessmentIds = params.assessmentIds || [];
        // Check if arrays have same elements (order doesn't matter)
        if (reportAssessmentIds.length !== assessmentIdsArray.length) return false;
        
        const arraysMatch = 
          [...reportAssessmentIds].sort().join(',') === 
          [...assessmentIdsArray].sort().join(',');
        
        return arraysMatch;
      }

      return true;
    });

    console.log('✅ Submission status checked:', { isSubmitted });

    res.status(200).json({
      success: true,
      isSubmitted,
      message: isSubmitted ? 'Report already submitted' : 'Report not submitted yet'
    });

  } catch (error) {
    console.error("❌ checkReportSubmission error:", error);
    res.status(500).json({ 
      error: "Failed to check report submission status",
      message: error.message 
    });
  }
};