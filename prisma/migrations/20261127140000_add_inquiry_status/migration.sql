CREATE TYPE "InquiryStatus" AS ENUM ('new', 'in_progress', 'closed');

ALTER TABLE "Inquiry" ADD COLUMN "status" "InquiryStatus" NOT NULL DEFAULT 'new';
