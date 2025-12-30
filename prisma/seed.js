// prisma/seed.js
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // ===============================
  // PROGRAM LEVELS
  // ===============================

  const ug = await prisma.program.upsert({
    where: { slug: "ug" },
    update: {},
    create: {
      name: "Undergraduate",
      code: "UG",
      slug: "ug",
      type: "LEVEL",
      level: "UG",
    },
  });

  const pg = await prisma.program.upsert({
    where: { slug: "pg" },
    update: {},
    create: {
      name: "Postgraduate",
      code: "PG",
      slug: "pg",
      type: "LEVEL",
      level: "PG",
    },
  });

  // ===============================
  // DEGREE PROGRAMS
  // ===============================

  const bsc = await prisma.program.upsert({
    where: { slug: "bsc-computer-science" },
    update: {},
    create: {
      name: "BSc Computer Science",
      code: "BSC-CS",
      slug: "bsc-computer-science",
      type: "DEGREE",
      parentId: ug.id,
      duration: 3,
    },
  });

  // ===============================
  // DEPARTMENT
  // ===============================

  const csDept = await prisma.department.upsert({
    where: { slug: "computer-science" },
    update: { programId: bsc.id },
    create: {
      name: "Computer Science",
      code: "CS",
      slug: "computer-science",
      programId: bsc.id,
    },
  });

  // ===============================
  // HOD USER
  // ===============================

  const hodPassword = await bcrypt.hash("hod123", 12);

  const hod = await prisma.user.upsert({
    where: { email: "hod@college.edu" },
    update: {
      name: "Test HOD",
      password: hodPassword,
      role: "HOD",
      departmentId: csDept.id,
    },
    create: {
      name: "Test HOD",
      email: "hod@college.edu",
      password: hodPassword,
      role: "HOD",
      departmentId: csDept.id,
    },
  });

  // ===============================
  // TEST COURSE
  // ===============================

  await prisma.course.upsert({
    where: { slug: "data-science" },
    update: {
      semester: 5,
      credits: 4,
      type: "THEORY",
      departmentId: csDept.id,
      createdById: hod.id,
      description: "Test course for API development",
    },
    create: {
      name: "Data Science",
      code: "DS101",
      slug: "data-science",
      semester: 5,
      credits: 4,
      type: "THEORY",
      departmentId: csDept.id,
      createdById: hod.id,
      description: "Test course for API development",
    },
  });
  // ===============================
  // PROGRAM OUTCOMES (POs)
  // ===============================
  console.log("🎯 Seeding POs...");
  const poData = [
    { code: "PO1", statement: "Engineering Knowledge: Apply knowledge of mathematics and science.", order: 1 },
    { code: "PO2", statement: "Problem Analysis: Identify and analyze complex problems.", order: 2 },
    { code: "PO3", statement: "Design/Development: Design solutions for complex problems.", order: 3 },
    { code: "PO4", statement: "Conduct Investigations: Use research-based knowledge.", order: 4 },
    { code: "PO5", statement: "Modern Tool Usage: Create and apply appropriate techniques.", order: 5 },
  ];

  for (const po of poData) {
    await prisma.po.upsert({
      where: { code_programId: { code: po.code, programId: bsc.id } },
      update: {},
      create: { ...po, programId: bsc.id },
    });
  }

  // ===============================
  // PROGRAM SPECIFIC OUTCOMES (PSOs)
  // ===============================
  console.log("🎯 Seeding PSOs...");
  const psoData = [
    { code: "PSO1", statement: "Analyze and build computer-based systems.", order: 1 },
    { code: "PSO2", statement: "Apply software engineering principles.", order: 2 },
  ];

  for (const pso of psoData) {
    await prisma.pso.upsert({
      where: { code_programId: { code: pso.code, programId: bsc.id } },
      update: {},
      create: { ...pso, programId: bsc.id },
    });
  }

  console.log("✅ Seeding completed successfully");
}


main()
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
