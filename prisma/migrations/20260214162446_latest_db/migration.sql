-- CreateTable
CREATE TABLE `assessments` (
    `id` VARCHAR(191) NOT NULL,
    `courseId` VARCHAR(191) NOT NULL,
    `facultyId` VARCHAR(191) NOT NULL,
    `semester` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `maxMarks` DOUBLE NOT NULL,
    `weightage` DOUBLE NOT NULL DEFAULT 0,
    `type` ENUM('CONTINUOUS', 'MID_TERM', 'SEMESTER_END', 'PRACTICAL', 'OTHER') NOT NULL,
    `mode` ENUM('WRITTEN', 'PRESENTATION', 'ASSIGNMENT', 'PROJECT', 'LAB', 'QUIZ', 'MCQ', 'VIVA') NOT NULL,
    `subType` VARCHAR(191) NULL,
    `scheduledDate` DATETIME(3) NULL,
    `submissionDeadline` DATETIME(3) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `isMarksFinalized` BOOLEAN NOT NULL DEFAULT false,
    `marksFinalizedAt` DATETIME(3) NULL,
    `marksFinalizedById` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `assessments_courseId_idx`(`courseId`),
    INDEX `assessments_facultyId_idx`(`facultyId`),
    INDEX `assessments_semester_idx`(`semester`),
    INDEX `assessments_year_idx`(`year`),
    INDEX `assessments_type_idx`(`type`),
    INDEX `assessments_isMarksFinalized_idx`(`isMarksFinalized`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `assessment_clos` (
    `assessmentId` VARCHAR(191) NOT NULL,
    `cloId` VARCHAR(191) NOT NULL,
    `bloomLevel` ENUM('REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE') NOT NULL,
    `weightage` DOUBLE NOT NULL DEFAULT 0,
    `marksAllocated` DOUBLE NOT NULL,

    INDEX `assessment_clos_assessmentId_idx`(`assessmentId`),
    INDEX `assessment_clos_cloId_idx`(`cloId`),
    PRIMARY KEY (`assessmentId`, `cloId`, `bloomLevel`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `students` (
    `id` VARCHAR(191) NOT NULL,
    `rollNumber` VARCHAR(191) NOT NULL,
    `admissionYear` INTEGER NOT NULL,
    `currentSemester` INTEGER NOT NULL,
    `departmentId` VARCHAR(191) NOT NULL,
    `programId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `students_rollNumber_key`(`rollNumber`),
    UNIQUE INDEX `students_userId_key`(`userId`),
    INDEX `students_departmentId_idx`(`departmentId`),
    INDEX `students_programId_idx`(`programId`),
    INDEX `students_userId_idx`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `marks` (
    `studentId` VARCHAR(191) NOT NULL,
    `assessmentId` VARCHAR(191) NOT NULL,
    `cloId` VARCHAR(191) NOT NULL,
    `marksObtained` DOUBLE NOT NULL DEFAULT 0,
    `enteredById` VARCHAR(191) NOT NULL,
    `enteredAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `marks_studentId_idx`(`studentId`),
    INDEX `marks_assessmentId_idx`(`assessmentId`),
    INDEX `marks_cloId_idx`(`cloId`),
    INDEX `marks_enteredById_idx`(`enteredById`),
    PRIMARY KEY (`studentId`, `assessmentId`, `cloId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `student_course_enrollments` (
    `studentId` VARCHAR(191) NOT NULL,
    `courseId` VARCHAR(191) NOT NULL,
    `semester` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `status` ENUM('ENROLLED', 'COMPLETED', 'DROPPED', 'FAILED') NOT NULL DEFAULT 'ENROLLED',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `student_course_enrollments_studentId_idx`(`studentId`),
    INDEX `student_course_enrollments_courseId_idx`(`courseId`),
    INDEX `student_course_enrollments_semester_idx`(`semester`),
    INDEX `student_course_enrollments_year_idx`(`year`),
    PRIMARY KEY (`studentId`, `courseId`, `semester`, `year`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `assessments` ADD CONSTRAINT `assessments_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessments` ADD CONSTRAINT `assessments_facultyId_fkey` FOREIGN KEY (`facultyId`) REFERENCES `faculties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessments` ADD CONSTRAINT `assessments_marksFinalizedById_fkey` FOREIGN KEY (`marksFinalizedById`) REFERENCES `faculties`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessment_clos` ADD CONSTRAINT `assessment_clos_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `assessment_clos` ADD CONSTRAINT `assessment_clos_cloId_fkey` FOREIGN KEY (`cloId`) REFERENCES `clos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `students` ADD CONSTRAINT `students_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `students` ADD CONSTRAINT `students_programId_fkey` FOREIGN KEY (`programId`) REFERENCES `programs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `students` ADD CONSTRAINT `students_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `marks` ADD CONSTRAINT `marks_enteredById_fkey` FOREIGN KEY (`enteredById`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `marks` ADD CONSTRAINT `marks_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `marks` ADD CONSTRAINT `marks_assessmentId_fkey` FOREIGN KEY (`assessmentId`) REFERENCES `assessments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `marks` ADD CONSTRAINT `marks_cloId_fkey` FOREIGN KEY (`cloId`) REFERENCES `clos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_course_enrollments` ADD CONSTRAINT `student_course_enrollments_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `student_course_enrollments` ADD CONSTRAINT `student_course_enrollments_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
