-- CreateTable
CREATE TABLE `performance_reports` (
    `id` VARCHAR(191) NOT NULL,
    `report_name` VARCHAR(191) NOT NULL,
    `report_parameters` JSON NOT NULL,
    `created_by_id` VARCHAR(191) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `is_submitted_to_hod` BOOLEAN NOT NULL DEFAULT false,
    `submitted_to_hod_at` DATETIME(3) NULL,
    `report_type` ENUM('SINGLE', 'COMBINED') NOT NULL DEFAULT 'COMBINED',
    `academic_year` VARCHAR(191) NULL,
    `course_id` VARCHAR(191) NULL,

    INDEX `performance_reports_created_by_id_idx`(`created_by_id`),
    INDEX `performance_reports_is_submitted_to_hod_idx`(`is_submitted_to_hod`),
    INDEX `performance_reports_report_type_idx`(`report_type`),
    INDEX `performance_reports_academic_year_idx`(`academic_year`),
    INDEX `performance_reports_course_id_idx`(`course_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `performance_reports` ADD CONSTRAINT `performance_reports_created_by_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `performance_reports` ADD CONSTRAINT `performance_reports_course_id_fkey` FOREIGN KEY (`course_id`) REFERENCES `courses`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
