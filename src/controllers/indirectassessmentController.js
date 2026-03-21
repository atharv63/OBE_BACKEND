// backend/controllers/faculty/indirectAssessment.controller.js
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// backend/controllers/faculty/indirectAssessment.controller.js - Update the import function
// backend/controllers/faculty/indirectAssessment.controller.js - Update the import function
const importIndirectAssessments = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;
    const { year, semester, mappings, data } = req.body;

    console.log("=== IMPORT INDIRECT ASSESSMENTS STARTED ===");
    console.log(`Course ID: ${courseId}`);
    console.log(`Year: ${year}, Semester: ${semester}`);
    console.log(`User ID: ${userId}`);
    console.log(`Mappings:`, JSON.stringify(mappings, null, 2));
    console.log(`Data rows received: ${data?.length || 0}`);

    // Log the actual data being sent
    console.log("\n=== DATA BEING IMPORTED ===");
    data?.forEach((row, index) => {
      console.log(`Row ${index + 1}:`, JSON.stringify(row, null, 2));
    });

    if (!courseId || !year || !semester || !mappings || !data) {
      console.error("Missing required fields:", {
        courseId: !!courseId,
        year: !!year,
        semester: !!semester,
        mappings: !!mappings,
        data: !!data,
      });
      return res.status(400).json({
        error:
          "Missing required fields: courseId, year, semester, mappings, data",
      });
    }

    // Verify course exists and user has access
    console.log(`\nVerifying course access for courseId: ${courseId}`);
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        OR: [
          { createdById: userId },
          {
            facultyAssignments: {
              some: {
                faculty: {
                  userId: userId,
                },
              },
            },
          },
        ],
      },
      include: {
        clos: {
          where: { isActive: true },
          select: { id: true, code: true },
        },
      },
    });

    if (!course) {
      console.error(
        `Course not found or access denied for courseId: ${courseId}, userId: ${userId}`,
      );
      return res
        .status(404)
        .json({ error: "Course not found or access denied" });
    }

    console.log(`Course found: ${course.code} - ${course.name}`);
    console.log(`Active CLOs found: ${course.clos.length}`);
    console.log(`CLO codes:`, course.clos.map((c) => c.code).join(", "));

    // Create a map of CLO codes to IDs
    const cloMap = {};
    course.clos.forEach((clo) => {
      cloMap[clo.code] = clo.id;
    });
    console.log(`CLO Map created:`, Object.keys(cloMap).join(", "));

    // Validate that all CLOs in mappings exist in the course
    const missingClos = [];
    for (const cloCode of Object.keys(mappings.cloColumns)) {
      if (!cloMap[cloCode]) {
        missingClos.push(cloCode);
      }
    }

    if (missingClos.length > 0) {
      console.error(`Missing CLOs in course: ${missingClos.join(", ")}`);
      console.error(`Available CLOs:`, Object.keys(cloMap).join(", "));
      return res.status(400).json({
        error: `The following CLOs are not found in this course: ${missingClos.join(", ")}`,
        availableClos: Object.keys(cloMap),
      });
    }

    const results = {
      totalRows: data.length,
      totalExpectedRatings:
        data.length * Object.keys(mappings.cloColumns).length,
      successful: 0,
      failed: 0,
      errors: [],
    };

    console.log(
      `\nProcessing ${data.length} rows with ${Object.keys(mappings.cloColumns).length} CLOs each`,
    );
    console.log(`Total expected ratings: ${results.totalExpectedRatings}`);

    // First, get all enrolled students for this course, semester, and year
    console.log(
      `\nFetching enrolled students for course ${courseId}, semester ${semester}, year ${year}`,
    );
    const enrolledStudents = await prisma.studentCourseEnrollment.findMany({
      where: {
        courseId: courseId,
        semester: parseInt(semester),
        year: parseInt(year),
        status: "ENROLLED",
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
                email: true,
              },
            },
          },
        },
      },
    });

    // Create arrays and maps for enrolled students
    const enrolledStudentIds = enrolledStudents.map((es) => es.studentId);

    // Create a map of roll numbers to student IDs for quick lookup
    const enrolledStudentMap = new Map();
    const enrolledRollNumbers = [];

    enrolledStudents.forEach((enrollment) => {
      const rollNumber = enrollment.student.rollNumber;
      enrolledStudentMap.set(rollNumber, enrollment.student.id);
      enrolledRollNumbers.push(rollNumber);
    });

    console.log(
      `Found ${enrolledStudents.length} enrolled students for this course/semester/year`,
    );
    console.log(`Enrolled student IDs:`, enrolledStudentIds);
    console.log(`Enrolled roll numbers:`, enrolledRollNumbers);

    // Process each row (each student)
    for (const [rowIndex, row] of data.entries()) {
      const rowNumber = rowIndex + 1;
      console.log(`\n--- Processing Row ${rowNumber} ---`);

      try {
        const rollNo = row[mappings.rollNoColumn]?.toString().trim();
        console.log(
          `Roll number from column ${mappings.rollNoColumn}: "${rollNo}"`,
        );

        if (!rollNo) {
          console.error(`Row ${rowNumber}: Missing roll number`);
          results.failed += Object.keys(mappings.cloColumns).length;
          results.errors.push(`Row ${rowNumber}: Missing roll number`);
          continue;
        }

        // Check if this roll number is enrolled using the map
        const studentId = enrolledStudentMap.get(rollNo);

        if (!studentId) {
          console.error(
            `Row ${rowNumber}: Student with roll no "${rollNo}" is NOT enrolled in this course for semester ${semester}, year ${year}`,
          );
          console.log(
            `Enrolled roll numbers for this course:`,
            enrolledRollNumbers,
          );
          results.failed += Object.keys(mappings.cloColumns).length;
          results.errors.push(
            `Row ${rowNumber}: Student ${rollNo} is not enrolled in this course for semester ${semester}, year ${year}`,
          );
          continue;
        }

        // Get the full enrollment record to access student details if needed
        const enrollment = enrolledStudents.find(
          (e) => e.student.rollNumber === rollNo,
        );
        console.log(`Student found: ID=${studentId}, Roll=${rollNo}`);
        console.log(
          `Student name: ${enrollment?.student?.user?.name || "N/A"}`,
        );
        console.log(
          `Enrollment verified: Student ${rollNo} is enrolled in this course`,
        );

        // Process each CLO rating for this student
        for (const [cloCode, column] of Object.entries(mappings.cloColumns)) {
          console.log(`\n  Processing ${cloCode} from column ${column}`);

          try {
            const ratingValue = row[column]?.toString().trim();
            console.log(`  Raw rating value: "${ratingValue}"`);

            if (!ratingValue && ratingValue !== "0") {
              console.error(`  ${cloCode}: Missing rating value`);
              results.failed++;
              results.errors.push(
                `Row ${rowNumber}, ${cloCode}: Missing rating`,
              );
              continue;
            }
            let rating = parseFloat(ratingValue);
            console.log(`  Parsed rating: ${rating}`);

            if (isNaN(rating)) {
              console.error(
                `  ${cloCode}: Rating is not a number: "${ratingValue}"`,
              );
              results.failed++;
              results.errors.push(
                `Row ${rowNumber}, ${cloCode}: Rating is not a number (got: ${ratingValue})`,
              );
              continue;
            }

            // Clamp to valid range 0–3 and round to nearest integer
            if (rating < 0) {
              console.warn(
                `  ${cloCode}: Rating ${rating} below 0 — clamped to 0`,
              );
              rating = 0;
            } else if (rating > 3) {
              console.warn(
                `  ${cloCode}: Rating ${rating} above 3 — clamped to 3`,
              );
              rating = 3;
            }
            rating = Math.round(rating);
            console.log(`  Final rating after clamping: ${rating}`);
            const cloId = cloMap[cloCode];
            console.log(`  CLO ID for ${cloCode}: ${cloId}`);

            if (!cloId) {
              console.error(`  ${cloCode}: CLO code not found in course CLOs`);
              results.failed++;
              results.errors.push(
                `Row ${rowNumber}: CLO ${cloCode} not found for this course`,
              );
              continue;
            }

            // Check if record already exists
            console.log(`  Checking for existing record with:`);
            console.log(`    studentId: ${studentId}`);
            console.log(`    cloId: ${cloId}`);
            console.log(`    courseId: ${courseId}`);
            console.log(`    year: ${parseInt(year)}`);
            console.log(`    semester: ${parseInt(semester)}`);

            const existingRecord = await prisma.indirectAssessment.findUnique({
              where: {
                studentId_cloId_courseId_year_semester: {
                  studentId: studentId,
                  cloId: cloId,
                  courseId: courseId,
                  year: parseInt(year),
                  semester: parseInt(semester),
                },
              },
            });

            console.log(
              `  Existing record: ${existingRecord ? "FOUND (will update)" : "NOT FOUND (will create)"}`,
            );

            // Create or update indirect assessment
            console.log(
              `  Attempting to upsert rating for student ${studentId}, CLO ${cloId}, rating ${rating}`,
            );

            const operation = await prisma.indirectAssessment.upsert({
              where: {
                studentId_cloId_courseId_year_semester: {
                  studentId: studentId,
                  cloId: cloId,
                  courseId: courseId,
                  year: parseInt(year),
                  semester: parseInt(semester),
                },
              },
              update: {
                rating: rating,
                source: "Excel Import",
              },
              create: {
                studentId: studentId,
                cloId: cloId,
                courseId: courseId,
                year: parseInt(year),
                semester: parseInt(semester),
                rating: rating,
                source: "Excel Import",
              },
            });

            console.log(
              `  ✓ SUCCESS: ${existingRecord ? "Updated" : "Created"} rating ${rating} for ${cloCode}`,
            );
            results.successful++;
          } catch (error) {
            console.error(`  ✗ ERROR processing ${cloCode}:`, error.message);
            console.error(error.stack);
            results.failed++;
            results.errors.push(
              `Row ${rowNumber}, ${cloCode}: ${error.message}`,
            );
          }
        }
      } catch (error) {
        console.error(`Row ${rowNumber} processing error:`, error.message);
        console.error(error.stack);
        results.failed += Object.keys(mappings.cloColumns).length;
        results.errors.push(`Row ${rowNumber}: ${error.message}`);
      }
    }

    console.log("\n=== IMPORT SUMMARY ===");
    console.log(`Total Rows: ${results.totalRows}`);
    console.log(`Expected Ratings: ${results.totalExpectedRatings}`);
    console.log(`Successful: ${results.successful}`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Errors: ${results.errors.length}`);

    if (results.errors.length > 0) {
      console.log("\nErrors:");
      results.errors.forEach((err, i) => console.log(`  ${i + 1}. ${err}`));
    }

    // Return the results even if there are errors
    res.json({
      success: true,
      data: results,
    });
  } catch (error) {
    console.error("=== FATAL ERROR in importIndirectAssessments ===");
    console.error("Error message:", error.message);
    console.error("Error stack:", error.stack);

    // Check for specific Prisma errors
    if (error.code) {
      console.error(`Prisma Error Code: ${error.code}`);
    }

    res.status(500).json({
      error: error.message,
      details: error.meta || null,
    });
  }
};
const getIndirectAssessments = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;
    const { year, semester } = req.query;

    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        OR: [
          { createdById: userId },
          { facultyAssignments: { some: { faculty: { userId } } } },
        ],
      },
    });

    if (!course) {
      return res
        .status(404)
        .json({ error: "Course not found or access denied" });
    }

    const where = { courseId };
    if (year) where.year = parseInt(year);
    if (semester) where.semester = parseInt(semester);

    const rawData = await prisma.indirectAssessment.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            rollNumber: true,
            user: { select: { name: true } },
          },
        },
        clo: {
          select: {
            id: true,
            code: true,
            statement: true,
            bloomLevel: true,
            order: true,
            attainmentThreshold: true,
          },
        },
      },
      orderBy: [{ clo: { order: "asc" } }, { student: { rollNumber: "asc" } }],
    });

    res.json({
      success: true,
      data: {
        courseId,
        totalRatings: rawData.length,
        hasData: rawData.length > 0,
        rawData,
      },
    });
  } catch (error) {
    console.error("getIndirectAssessments error:", error);
    res.status(500).json({ error: error.message });
  }
};
// Get available years and semesters for a course
const getIndirectAssessmentMetadata = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    // Verify course access
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        OR: [
          { createdById: userId },
          {
            facultyAssignments: {
              some: {
                faculty: {
                  userId: userId,
                },
              },
            },
          },
        ],
      },
    });

    if (!course) {
      return res
        .status(404)
        .json({ error: "Course not found or access denied" });
    }

    // Get distinct years and semesters
    const periods = await prisma.indirectAssessment.findMany({
      where: { courseId },
      select: {
        year: true,
        semester: true,
      },
      distinct: ["year", "semester"],
      orderBy: [{ year: "desc" }, { semester: "desc" }],
    });

    // Get all possible semesters from course enrollments
    const enrollmentPeriods = await prisma.studentCourseEnrollment.findMany({
      where: {
        courseId,
        status: "ENROLLED",
      },
      select: {
        year: true,
        semester: true,
      },
      distinct: ["year", "semester"],
      orderBy: [{ year: "desc" }, { semester: "desc" }],
    });

    // Get CLOs for template reference
    const clos = await prisma.clo.findMany({
      where: {
        courseId,
        isActive: true,
      },
      select: {
        code: true,
        statement: true,
        bloomLevel: true,
      },
      orderBy: { order: "asc" },
    });

    res.json({
      success: true,
      data: {
        courseId,
        courseCode: course.code,
        courseName: course.name,
        availablePeriods: periods,
        enrollmentPeriods,
        clos: clos.map((c) => ({
          code: c.code,
          statement: c.statement,
          bloomLevel: c.bloomLevel,
        })),
        suggestedColumns: {
          rollNo: "Student Roll Number",
          cloCode: "CLO Code",
          rating: "Rating (1-5)",
        },
      },
    });
  } catch (error) {
    console.error("getIndirectAssessmentMetadata error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Delete indirect assessments for a period
const deleteIndirectAssessments = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;
    const { year, semester } = req.body;

    if (!year || !semester) {
      return res.status(400).json({ error: "Year and semester are required" });
    }

    // Verify course access
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        OR: [
          { createdById: userId },
          {
            facultyAssignments: {
              some: {
                faculty: {
                  userId: userId,
                },
              },
            },
          },
        ],
      },
    });

    if (!course) {
      return res
        .status(404)
        .json({ error: "Course not found or access denied" });
    }

    const result = await prisma.indirectAssessment.deleteMany({
      where: {
        courseId,
        year: parseInt(year),
        semester: parseInt(semester),
      },
    });

    res.json({
      success: true,
      data: {
        message: `Deleted ${result.count} indirect assessments`,
        count: result.count,
      },
    });
  } catch (error) {
    console.error("deleteIndirectAssessments error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Get template/preview data for import
const getImportTemplate = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    // Verify course access
    const course = await prisma.course.findFirst({
      where: {
        id: courseId,
        OR: [
          { createdById: userId },
          {
            facultyAssignments: {
              some: {
                faculty: {
                  userId: userId,
                },
              },
            },
          },
        ],
      },
      include: {
        department: {
          include: {
            program: true,
          },
        },
      },
    });

    if (!course) {
      return res
        .status(404)
        .json({ error: "Course not found or access denied" });
    }

    // Get CLOs for the course
    const clos = await prisma.clo.findMany({
      where: {
        courseId,
        isActive: true,
      },
      select: {
        code: true,
        statement: true,
        bloomLevel: true,
      },
      orderBy: { order: "asc" },
    });

    // Get enrolled students
    const enrollments = await prisma.studentCourseEnrollment.findMany({
      where: {
        courseId,
        status: "ENROLLED",
      },
      include: {
        student: {
          select: {
            rollNumber: true,
            user: {
              select: {
                name: true,
              },
            },
          },
        },
      },
      take: 10, // Limit for preview
      orderBy: {
        student: { rollNumber: "asc" },
      },
    });

    // Generate sample data
    const sampleData = [];
    enrollments.forEach((enrollment) => {
      const row = {
        RollNo: enrollment.student.rollNumber,
        StudentName: enrollment.student.user?.name || "Student Name",
      };
      clos.forEach((clo) => {
        row[clo.code] = Math.floor(Math.random() * 3) + 3; // Random 3-5 for sample
      });
      sampleData.push(row);
    });

    res.json({
      success: true,
      data: {
        course: {
          id: course.id,
          code: course.code,
          name: course.name,
          semester: course.semester,
          program: course.department.program.name,
        },
        clos: clos.map((c) => ({
          code: c.code,
          statement: c.statement,
          bloomLevel: c.bloomLevel,
        })),
        sampleStudents: enrollments.map((e) => ({
          rollNo: e.student.rollNumber,
          name: e.student.user?.name,
        })),
        suggestedFormat: {
          headers: ["RollNo", "StudentName", ...clos.map((c) => c.code)],
          sampleRows: sampleData.slice(0, 3),
        },
        columnMappingInstructions: {
          rollNo: "Select column containing roll numbers",
          ratings: "For each CLO, select the column containing its ratings",
        },
      },
    });
  } catch (error) {
    console.error("getImportTemplate error:", error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  importIndirectAssessments,
  getIndirectAssessments,
  getIndirectAssessmentMetadata,
  deleteIndirectAssessments,
  getImportTemplate,
};
