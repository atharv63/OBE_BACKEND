-- CreateTable
CREATE TABLE `indirect_assessments` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `studentId` VARCHAR(191) NOT NULL,
    `cloId` VARCHAR(191) NOT NULL,
    `courseId` VARCHAR(191) NOT NULL,
    `year` INTEGER NOT NULL,
    `semester` INTEGER NOT NULL,
    `rating` DOUBLE NOT NULL,
    `source` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `indirect_assessments_studentId_idx`(`studentId`),
    INDEX `indirect_assessments_cloId_idx`(`cloId`),
    INDEX `indirect_assessments_courseId_idx`(`courseId`),
    INDEX `indirect_assessments_year_idx`(`year`),
    INDEX `indirect_assessments_semester_idx`(`semester`),
    UNIQUE INDEX `indirect_assessments_studentId_cloId_courseId_year_semester_key`(`studentId`, `cloId`, `courseId`, `year`, `semester`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `indirect_assessments` ADD CONSTRAINT `indirect_assessments_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `indirect_assessments` ADD CONSTRAINT `indirect_assessments_cloId_fkey` FOREIGN KEY (`cloId`) REFERENCES `clos`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `indirect_assessments` ADD CONSTRAINT `indirect_assessments_courseId_fkey` FOREIGN KEY (`courseId`) REFERENCES `courses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
