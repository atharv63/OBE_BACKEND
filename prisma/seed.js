// prisma/seed.js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function clearDatabase() {
  console.log('🧹 Clearing existing data...');

  // Delete in correct order to avoid foreign key constraints
  await prisma.cloPsoMapping.deleteMany();
  await prisma.cloPoMapping.deleteMany();
  await prisma.clo.deleteMany();
  await prisma.courseFaculty.deleteMany(); // This is your model name
  await prisma.course.deleteMany();
  await prisma.pso.deleteMany();
  await prisma.po.deleteMany();
  await prisma.faculty.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();
  await prisma.program.deleteMany();

  console.log('✅ Database cleared');
}

async function main() {
  console.log('🌱 Seeding database...');
  
  // Clear existing data
  await clearDatabase();

  // ===============================
  // HASH PASSWORDS
  // ===============================
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('password123', salt);

  // ===============================
  // PROGRAM LEVELS
  // ===============================
  const ug = await prisma.program.create({
    data: {
      name: 'Undergraduate',
      code: 'UG',
      slug: 'ug',
      type: 'LEVEL',
      level: 'UG',
      description: 'Undergraduate level programs',
      order: 1,
    },
  });

  const pg = await prisma.program.create({
    data: {
      name: 'Postgraduate',
      code: 'PG',
      slug: 'pg',
      type: 'LEVEL',
      level: 'PG',
      description: 'Postgraduate level programs',
      order: 2,
    },
  });

  console.log('✅ Created program levels');

  // ===============================
  // DEGREE PROGRAMS
  // ===============================
  const bscCS = await prisma.program.create({
    data: {
      name: 'BSc Computer Science',
      code: 'BSC-CS',
      slug: 'bsc-computer-science',
      type: 'DEGREE',
      level: 'UG',
      parentId: ug.id,
      duration: 3,
      description: 'Bachelor of Science in Computer Science',
      order: 1,
    },
  });

  const bscIT = await prisma.program.create({
    data: {
      name: 'BSc Information Technology',
      code: 'BSC-IT',
      slug: 'bsc-information-technology',
      type: 'DEGREE',
      level: 'UG',
      parentId: ug.id,
      duration: 3,
      description: 'Bachelor of Science in Information Technology',
      order: 2,
    },
  });

  const mscCS = await prisma.program.create({
    data: {
      name: 'MSc Computer Science',
      code: 'MSC-CS',
      slug: 'msc-computer-science',
      type: 'DEGREE',
      level: 'PG',
      parentId: pg.id,
      duration: 2,
      description: 'Master of Science in Computer Science',
      order: 3,
    },
  });

  console.log('✅ Created degree programs');

  // ===============================
  // DEPARTMENTS
  // ===============================
  const csDept = await prisma.department.create({
    data: {
      name: 'Computer Science',
      code: 'CS',
      slug: 'computer-science',
      programId: bscCS.id,
      description: 'Department of Computer Science and Engineering',
      order: 1,
    },
  });

  const itDept = await prisma.department.create({
    data: {
      name: 'Information Technology',
      code: 'IT',
      slug: 'information-technology',
      programId: bscIT.id,
      description: 'Department of Information Technology',
      order: 2,
    },
  });

  const pgDept = await prisma.department.create({
    data: {
      name: 'Computer Science (PG)',
      code: 'CSPG',
      slug: 'computer-science-pg',
      programId: mscCS.id,
      description: 'Department of Computer Science - Postgraduate',
      order: 3,
    },
  });

  console.log('✅ Created departments');

  // ===============================
  // ADMIN USER
  // ===============================
  const admin = await prisma.user.create({
    data: {
      name: 'System Administrator',
      email: 'admin@college.edu',
      password: hashedPassword,
      role: 'ADMIN',
      isActive: true,
    },
  });

  console.log('✅ Created admin user');

  // ===============================
  // HOD USERS
  // ===============================
  const csHod = await prisma.user.create({
    data: {
      name: 'Dr. John Smith',
      email: 'hod.cs@college.edu',
      password: hashedPassword,
      role: 'HOD',
      departmentId: csDept.id,
      isActive: true,
    },
  });

  const itHod = await prisma.user.create({
    data: {
      name: 'Dr. Emily Chen',
      email: 'hod.it@college.edu',
      password: hashedPassword,
      role: 'HOD',
      departmentId: itDept.id,
      isActive: true,
    },
  });

  const pgHod = await prisma.user.create({
    data: {
      name: 'Dr. Robert Davis',
      email: 'hod.pg@college.edu',
      password: hashedPassword,
      role: 'HOD',
      departmentId: pgDept.id,
      isActive: true,
    },
  });

  // Update departments with HOD IDs
  await prisma.department.updateMany({
    where: { id: csDept.id },
    data: { hodId: csHod.id }
  });

  await prisma.department.updateMany({
    where: { id: itDept.id },
    data: { hodId: itHod.id }
  });

  await prisma.department.updateMany({
    where: { id: pgDept.id },
    data: { hodId: pgHod.id }
  });

  console.log('✅ Created HOD users');

  // ===============================
  // FACULTY USERS
  // ===============================
  const facultyUsers = await Promise.all([
    // CS Department Faculty
    prisma.user.create({
      data: {
        name: 'Dr. Jane Doe',
        email: 'jane.doe@college.edu',
        password: hashedPassword,
        role: 'FACULTY',
        departmentId: csDept.id,
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Prof. Robert Johnson',
        email: 'robert.j@college.edu',
        password: hashedPassword,
        role: 'FACULTY',
        departmentId: csDept.id,
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Dr. Sarah Williams',
        email: 'sarah.w@college.edu',
        password: hashedPassword,
        role: 'FACULTY',
        departmentId: csDept.id,
        isActive: true,
      },
    }),
    // IT Department Faculty
    prisma.user.create({
      data: {
        name: 'Prof. Michael Brown',
        email: 'michael.b@college.edu',
        password: hashedPassword,
        role: 'FACULTY',
        departmentId: itDept.id,
        isActive: true,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Dr. Susan Taylor',
        email: 'susan.t@college.edu',
        password: hashedPassword,
        role: 'FACULTY',
        departmentId: itDept.id,
        isActive: true,
      },
    }),
    // PG Department Faculty
    prisma.user.create({
      data: {
        name: 'Dr. James Anderson',
        email: 'james.a@college.edu',
        password: hashedPassword,
        role: 'FACULTY',
        departmentId: pgDept.id,
        isActive: true,
      },
    }),
  ]);

  console.log('✅ Created faculty users');

  // ===============================
  // FACULTY PROFILES
  // ===============================
  const faculties = await Promise.all([
    // CS Faculty
    prisma.faculty.create({
      data: {
        name: 'Dr. Jane Doe',
        designation: 'Professor',
        qualifications: 'PhD in Computer Science, Stanford University',
        departmentId: csDept.id,
        userId: facultyUsers[0].id,
        isActive: true,
      },
    }),
    prisma.faculty.create({
      data: {
        name: 'Prof. Robert Johnson',
        designation: 'Associate Professor',
        qualifications: 'M.Tech in Software Engineering, IIT Delhi',
        departmentId: csDept.id,
        userId: facultyUsers[1].id,
        isActive: true,
      },
    }),
    prisma.faculty.create({
      data: {
        name: 'Dr. Sarah Williams',
        designation: 'Assistant Professor',
        qualifications: 'PhD in Artificial Intelligence, MIT',
        departmentId: csDept.id,
        userId: facultyUsers[2].id,
        isActive: true,
      },
    }),
    // IT Faculty
    prisma.faculty.create({
      data: {
        name: 'Prof. Michael Brown',
        designation: 'Professor',
        qualifications: 'PhD in Information Technology, Carnegie Mellon',
        departmentId: itDept.id,
        userId: facultyUsers[3].id,
        isActive: true,
      },
    }),
    prisma.faculty.create({
      data: {
        name: 'Dr. Susan Taylor',
        designation: 'Associate Professor',
        qualifications: 'PhD in Cybersecurity, Georgia Tech',
        departmentId: itDept.id,
        userId: facultyUsers[4].id,
        isActive: true,
      },
    }),
    // PG Faculty
    prisma.faculty.create({
      data: {
        name: 'Dr. James Anderson',
        designation: 'Assistant Professor',
        qualifications: 'PhD in Data Science, Harvard University',
        departmentId: pgDept.id,
        userId: facultyUsers[5].id,
        isActive: true,
      },
    }),
  ]);

  console.log('✅ Created faculty profiles');

  // ===============================
  // COURSES
  // ===============================
  const currentYear = new Date().getFullYear();
  
  const courses = await Promise.all([
    // CS Courses
    prisma.course.create({
      data: {
        name: 'Data Structures and Algorithms',
        code: 'CS201',
        slug: 'data-structures-algorithms',
        semester: 3,
        credits: 4,
        type: 'THEORY',
        departmentId: csDept.id,
        createdById: csHod.id,
        description: 'Fundamental data structures and algorithm analysis',
        isActive: true,
      },
    }),
    prisma.course.create({
      data: {
        name: 'Database Management Systems',
        code: 'CS301',
        slug: 'database-management-systems',
        semester: 4,
        credits: 4,
        type: 'BOTH',
        departmentId: csDept.id,
        createdById: csHod.id,
        description: 'Relational database design and SQL programming',
        isActive: true,
      },
    }),
    prisma.course.create({
      data: {
        name: 'Artificial Intelligence',
        code: 'CS401',
        slug: 'artificial-intelligence',
        semester: 5,
        credits: 3,
        type: 'THEORY',
        departmentId: csDept.id,
        createdById: csHod.id,
        description: 'Introduction to AI concepts and techniques',
        isActive: true,
      },
    }),
    prisma.course.create({
      data: {
        name: 'Operating Systems',
        code: 'CS302',
        slug: 'operating-systems',
        semester: 4,
        credits: 3,
        type: 'BOTH',
        departmentId: csDept.id,
        createdById: csHod.id,
        description: 'Principles of operating system design',
        isActive: true,
      },
    }),
    prisma.course.create({
      data: {
        name: 'Computer Networks',
        code: 'CS303',
        slug: 'computer-networks',
        semester: 4,
        credits: 3,
        type: 'BOTH',
        departmentId: csDept.id,
        createdById: csHod.id,
        description: 'Network protocols and architectures',
        isActive: true,
      },
    }),
    // IT Courses
    prisma.course.create({
      data: {
        name: 'Network Security',
        code: 'IT401',
        slug: 'network-security',
        semester: 5,
        credits: 4,
        type: 'THEORY',
        departmentId: itDept.id,
        createdById: itHod.id,
        description: 'Principles of network security and cryptography',
        isActive: true,
      },
    }),
    prisma.course.create({
      data: {
        name: 'Web Technologies',
        code: 'IT301',
        slug: 'web-technologies',
        semester: 4,
        credits: 3,
        type: 'BOTH',
        departmentId: itDept.id,
        createdById: itHod.id,
        description: 'Modern web development technologies',
        isActive: true,
      },
    }),
    // PG Courses
    prisma.course.create({
      data: {
        name: 'Advanced Machine Learning',
        code: 'PG501',
        slug: 'advanced-machine-learning',
        semester: 1,
        credits: 4,
        type: 'BOTH',
        departmentId: pgDept.id,
        createdById: pgHod.id,
        description: 'Advanced topics in machine learning',
        isActive: true,
      },
    }),
    prisma.course.create({
      data: {
        name: 'Research Methodology',
        code: 'PG502',
        slug: 'research-methodology',
        semester: 1,
        credits: 3,
        type: 'THEORY',
        departmentId: pgDept.id,
        createdById: pgHod.id,
        description: 'Research methods in computer science',
        isActive: true,
      },
    }),
  ]);

  console.log('✅ Created courses');

  // ===============================
  // CLOs (Course Learning Outcomes)
  // ===============================
  for (const course of courses) {
    await Promise.all([
      prisma.clo.create({
        data: {
          code: 'CLO1',
          statement: `Understand fundamental concepts of ${course.name}`,
          bloomLevel: 'UNDERSTAND',
          courseId: course.id,
          createdById: course.createdById,
          order: 1,
          attainmentThreshold: 60.0,
          isActive: true,
        },
      }),
      prisma.clo.create({
        data: {
          code: 'CLO2',
          statement: `Apply principles of ${course.name.split(' ')[0]} to solve problems`,
          bloomLevel: 'APPLY',
          courseId: course.id,
          createdById: course.createdById,
          order: 2,
          attainmentThreshold: 65.0,
          isActive: true,
        },
      }),
      prisma.clo.create({
        data: {
          code: 'CLO3',
          statement: `Analyze complex scenarios using ${course.name.split(' ')[0]} techniques`,
          bloomLevel: 'ANALYZE',
          courseId: course.id,
          createdById: course.createdById,
          order: 3,
          attainmentThreshold: 70.0,
          isActive: true,
        },
      }),
    ]);
  }

  console.log('✅ Created CLOs');

  // ===============================
  // PROGRAM OUTCOMES (POs)
  // ===============================
  const pos = await Promise.all([
    // POs for BSc Computer Science
    prisma.po.create({
      data: {
        code: 'PO1',
        statement: 'Engineering Knowledge: Apply knowledge of mathematics, science, engineering fundamentals',
        programId: bscCS.id,
        order: 1,
      },
    }),
    prisma.po.create({
      data: {
        code: 'PO2',
        statement: 'Problem Analysis: Identify, formulate, research literature, and analyze complex engineering problems',
        programId: bscCS.id,
        order: 2,
      },
    }),
    prisma.po.create({
      data: {
        code: 'PO3',
        statement: 'Design/Development of Solutions: Design solutions for complex engineering problems',
        programId: bscCS.id,
        order: 3,
      },
    }),
    prisma.po.create({
      data: {
        code: 'PO4',
        statement: 'Investigation of Complex Problems: Use research-based knowledge to investigate complex problems',
        programId: bscCS.id,
        order: 4,
      },
    }),
    prisma.po.create({
      data: {
        code: 'PO5',
        statement: 'Modern Tool Usage: Create, select, and apply appropriate techniques and modern engineering tools',
        programId: bscCS.id,
        order: 5,
      },
    }),
    // POs for MSc Computer Science
    prisma.po.create({
      data: {
        code: 'PO1',
        statement: 'Advanced Engineering Knowledge: Apply advanced knowledge in computer science',
        programId: mscCS.id,
        order: 1,
      },
    }),
    prisma.po.create({
      data: {
        code: 'PO2',
        statement: 'Research and Analysis: Conduct research and analyze findings',
        programId: mscCS.id,
        order: 2,
      },
    }),
  ]);

  // ===============================
  // PROGRAM SPECIFIC OUTCOMES (PSOs)
  // ===============================
  const psos = await Promise.all([
    prisma.pso.create({
      data: {
        code: 'PSO1',
        statement: 'Professional Skills: Ability to design and develop software solutions',
        programId: bscCS.id,
        order: 1,
      },
    }),
    prisma.pso.create({
      data: {
        code: 'PSO2',
        statement: 'Problem-Solving Skills: Ability to apply computing knowledge to solve real-world problems',
        programId: bscCS.id,
        order: 2,
      },
    }),
    prisma.pso.create({
      data: {
        code: 'PSO1',
        statement: 'Research Skills: Ability to conduct advanced research in computer science',
        programId: mscCS.id,
        order: 1,
      },
    }),
  ]);

  console.log('✅ Created POs and PSOs');

  // ===============================
  // COURSE-FACULTY ASSIGNMENTS
  // ===============================
  const courseFaculties = await Promise.all([
    // CS Department Assignments
    prisma.courseFaculty.create({
      data: {
        courseId: courses[0].id, // Data Structures
        facultyId: faculties[0].id, // Dr. Jane Doe
        semester: 3,
        year: currentYear,
        teachingMethodology: 'Flipped Classroom',
        assessmentMode: 'Continuous Assessment',
      },
    }),
    prisma.courseFaculty.create({
      data: {
        courseId: courses[1].id, // DBMS
        facultyId: faculties[1].id, // Prof. Robert Johnson
        semester: 4,
        year: currentYear,
        teachingMethodology: 'Project-Based Learning',
        assessmentMode: 'Theory + Practical Exams',
      },
    }),
    prisma.courseFaculty.create({
      data: {
        courseId: courses[2].id, // AI
        facultyId: faculties[2].id, // Dr. Sarah Williams
        semester: 5,
        year: currentYear,
        teachingMethodology: 'Case Study Method',
        assessmentMode: 'Research Paper + Presentation',
      },
    }),
    // Multiple assignments for same faculty
    prisma.courseFaculty.create({
      data: {
        courseId: courses[3].id, // Operating Systems
        facultyId: faculties[0].id, // Dr. Jane Doe
        semester: 4,
        year: currentYear,
        teachingMethodology: 'Lecture-Based',
        assessmentMode: 'Mid-term + Final Exams',
      },
    }),
    // IT Department Assignments
    prisma.courseFaculty.create({
      data: {
        courseId: courses[5].id, // Network Security
        facultyId: faculties[3].id, // Prof. Michael Brown
        semester: 5,
        year: currentYear,
        teachingMethodology: 'Hands-on Workshops',
        assessmentMode: 'Lab Assignments + Project',
      },
    }),
    prisma.courseFaculty.create({
      data: {
        courseId: courses[6].id, // Web Technologies
        facultyId: faculties[4].id, // Dr. Susan Taylor
        semester: 4,
        year: currentYear,
        teachingMethodology: 'Project-Based Learning',
        assessmentMode: 'Project Development',
      },
    }),
    // PG Department Assignments
    prisma.courseFaculty.create({
      data: {
        courseId: courses[7].id, // Advanced Machine Learning
        facultyId: faculties[5].id, // Dr. James Anderson
        semester: 1,
        year: currentYear,
        teachingMethodology: 'Blended Learning',
        assessmentMode: 'Online Quizzes + Project',
      },
    }),
  ]);

  console.log('✅ Created course-faculty assignments');

  // ===============================
  // CLO-PO MAPPINGS
  // ===============================
  const allClos = await prisma.clo.findMany();
  
  for (const clo of allClos) {
    const course = await prisma.course.findUnique({
      where: { id: clo.courseId },
      include: { department: true }
    });
    
    if (course && course.department) {
      const program = await prisma.program.findUnique({
        where: { id: course.department.programId }
      });
      
      if (program) {
        const programPos = await prisma.po.findMany({
          where: { programId: program.id }
        });
        
        if (programPos.length > 0) {
          const maxMappings = Math.min(2, programPos.length);
          for (let i = 0; i < maxMappings; i++) {
            await prisma.cloPoMapping.create({
              data: {
                cloId: clo.id,
                poId: programPos[i].id,
                level: Math.floor(Math.random() * 3) + 1,
              },
            });
          }
        }
      }
    }
  }

  console.log('✅ Created CLO-PO mappings');

  // ===============================
  // CLO-PSO MAPPINGS
  // ===============================
  for (const clo of allClos) {
    const course = await prisma.course.findUnique({
      where: { id: clo.courseId },
      include: { department: true }
    });
    
    if (course && course.department) {
      const program = await prisma.program.findUnique({
        where: { id: course.department.programId }
      });
      
      if (program) {
        const programPsos = await prisma.pso.findMany({
          where: { programId: program.id }
        });
        
        if (programPsos.length > 0) {
          await prisma.cloPsoMapping.create({
            data: {
              cloId: clo.id,
              psoId: programPsos[0].id,
              level: Math.floor(Math.random() * 3) + 1,
            },
          });
        }
      }
    }
  }

  console.log('✅ Created CLO-PSO mappings');

  // ===============================
  // SUMMARY
  // ===============================
  console.log('\n📊 Database Seeding Summary:');
  console.log('===========================');
  console.log(`✅ Programs: ${await prisma.program.count()}`);
  console.log(`✅ Departments: ${await prisma.department.count()}`);
  console.log(`✅ Users: ${await prisma.user.count()}`);
  console.log(`✅ Faculty: ${await prisma.faculty.count()}`);
  console.log(`✅ Courses: ${await prisma.course.count()}`);
  console.log(`✅ CLOs: ${await prisma.clo.count()}`);
  console.log(`✅ POs: ${await prisma.po.count()}`);
  console.log(`✅ PSOs: ${await prisma.pso.count()}`);
  console.log(`✅ Course-Faculty Assignments: ${await prisma.courseFaculty.count()}`);
  console.log(`✅ CLO-PO Mappings: ${await prisma.cloPoMapping.count()}`);
  console.log(`✅ CLO-PSO Mappings: ${await prisma.cloPsoMapping.count()}`);
  
  console.log('\n🎉 Seeding completed successfully!');
  console.log('\n🔑 Test Credentials:');
  console.log('=====================');
  console.log('CS HOD: hod.cs@college.edu / password123');
  console.log('IT HOD: hod.it@college.edu / password123');
  console.log('PG HOD: hod.pg@college.edu / password123');
  console.log('Admin: admin@college.edu / password123');
  
  console.log('\n📚 Sample Faculty:');
  console.log('===================');
  console.log('1. Dr. Jane Doe - jane.doe@college.edu');
  console.log('2. Prof. Robert Johnson - robert.j@college.edu');
  console.log('3. Dr. Sarah Williams - sarah.w@college.edu');
  
  console.log('\n💡 All users have password: password123');
}

main()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });