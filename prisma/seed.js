// prisma/seed.js
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

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
    },
  });

  const pg = await prisma.program.create({
    data: {
      name: 'Postgraduate',
      code: 'PG',
      slug: 'pg',
      type: 'LEVEL',
      level: 'PG',
    },
  });

  // ===============================
  // DEGREE PROGRAMS
  // ===============================

  const bsc = await prisma.program.create({
    data: {
      name: 'BSc Computer Science',
      code: 'BSC-CS',
      slug: 'bsc-computer-science',
      type: 'DEGREE',
      parentId: ug.id,
      duration: 3,
    },
  });

  // ===============================
  // DEPARTMENT
  // ===============================

  const csDept = await prisma.department.create({
    data: {
      name: 'Computer Science',
      code: 'CS',
      slug: 'computer-science',
      programId: bsc.id,
    },
  });

  // ===============================
  // HOD USER
  // ===============================

  const hod = await prisma.user.create({
    data: {
      name: 'Test HOD',
      email: 'hod@college.edu',
      password: 'password123', // hash later
      role: 'HOD',
      departmentId: csDept.id,
    },
  });

  // ===============================
  // TEST COURSE
  // ===============================

  await prisma.course.create({
    data: {
      name: 'Data Science',
      code: 'DS101',
      slug: 'data-science',
      semester: 5,
      credits: 4,
      type: 'THEORY',
      departmentId: csDept.id,
      createdById: hod.id,
      description: 'Test course for API development',
    },
  });

  console.log('✅ Seeding completed successfully');
}

main()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
