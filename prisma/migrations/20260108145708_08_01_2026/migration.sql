-- CreateTable
CREATE TABLE `faculties` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `designation` VARCHAR(191) NULL,
    `qualifications` VARCHAR(191) NULL,
    `departmentId` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `deletedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `faculties_departmentId_idx`(`departmentId`),
    INDEX `faculties_userId_idx`(`userId`),
    UNIQUE INDEX `faculties_userId_key`(`userId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `course_faculties` (
    `courseId` VARCHAR(191) NOT NULL,
    `facultyId` VARCHAR(191) NOT NULL,
    `semester` INTEGER NOT NULL,
    `year` INTEGER NOT NULL,
    `teachingMethodology` VARCHAR(191) NULL,
    `assessmentMode` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `course_faculties_courseId_idx`(`courseId`),
    INDEX `course_faculties_facultyId_idx`(`facultyId`),
    INDEX `course_faculties_semester_idx`(`semester`),
    INDEX `course_faculties_year_idx`(`year`),
    PRIMARY KEY (`courseId`, `facultyId`, `semester`, `year`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `faculties` ADD CONSTRAINT `faculties_departmentId_fkey` FOREIGN KEY (`departmentId`) REFERENCES `departments`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `faculties` ADD CONSTRAINT `faculties_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_faculties` ADD CONSTRAINT `course_faculties_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `course_faculties` ADD CONSTRAINT `course_faculties_facultyId_fkey` FOREIGN KEY (`facultyId`) REFERENCES `faculties`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
