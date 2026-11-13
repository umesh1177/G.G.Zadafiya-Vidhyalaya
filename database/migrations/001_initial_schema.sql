-- =========================================================================
-- PostgreSQL DDL Migration: 001_initial_schema.sql
-- School Management System (11th-12th Science Stream: Group A PCM & Group B PCB)
-- =========================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Enums
CREATE TYPE "Role" AS ENUM ('STUDENT', 'ASSISTANT_FACULTY', 'SUBJECT_FACULTY', 'PRINCIPAL');
CREATE TYPE "Standard" AS ENUM ('STD_11', 'STD_12');
CREATE TYPE "Division" AS ENUM ('A', 'B');
CREATE TYPE "StreamGroup" AS ENUM ('GROUP_A', 'GROUP_B', 'GROUP_AB');
CREATE TYPE "SubjectCode" AS ENUM ('PHYSICS', 'CHEMISTRY', 'MATHEMATICS', 'BIOLOGY', 'ENGLISH', 'COMPUTER');
CREATE TYPE "ExamType" AS ENUM ('BOARD', 'JEE', 'NEET', 'GUJCET', 'WEEKLY', 'MONTHLY', 'ANNUAL', 'UNIT');
CREATE TYPE "ExamStatus" AS ENUM ('UPCOMING', 'AWAITING_MARKS', 'EVALUATED', 'PUBLISHED', 'CANCELLED');
CREATE TYPE "LtGrade" AS ENUM ('EXCELLENT', 'BETTER', 'GOOD', 'AB');
CREATE TYPE "LtStatus" AS ENUM ('PENDING_EVALUATION', 'EVALUATED', 'CANCELLED');
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'ALUMNI', 'INACTIVE');
CREATE TYPE "DisciplineType" AS ENUM ('COME_LATE', 'LONG_HAIR', 'LONG_NAIL', 'UNIFORM_ISSUE', 'OTHER');
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');
CREATE TYPE "AttendanceSession" AS ENUM ('MORNING', 'AFTERNOON');
CREATE TYPE "PublishStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "ReportPeriodType" AS ENUM ('WEEKLY', 'MONTHLY', 'ANNUAL');

-- 2. Core Users Table
CREATE TABLE "users" (
    "id" VARCHAR(30) PRIMARY KEY,
    "username" VARCHAR(50) UNIQUE NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "email" VARCHAR(100) UNIQUE NOT NULL,
    "contactNo" VARCHAR(20),
    "role" "Role" NOT NULL,
    "isActive" BOOLEAN DEFAULT true NOT NULL,
    "lastLoginAt" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX "idx_users_role_active" ON "users"("role", "isActive");

-- 3. Principal Profile Table
CREATE TABLE "principals" (
    "id" VARCHAR(30) PRIMARY KEY,
    "userId" VARCHAR(30) UNIQUE NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) UNIQUE NOT NULL,
    "contactNo" VARCHAR(20),
    "schoolName" VARCHAR(150) DEFAULT 'Shree Vidya Vihar Science School' NOT NULL,
    "qualification" VARCHAR(100),
    "joiningDate" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 4. Faculty Profile Table (Subject Faculty & Assistant Faculty)
CREATE TABLE "faculties" (
    "id" VARCHAR(30) PRIMARY KEY,
    "userId" VARCHAR(30) UNIQUE NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) UNIQUE NOT NULL,
    "contactNo" VARCHAR(20) NOT NULL,
    "role" "Role" NOT NULL,
    "primarySubject" "SubjectCode",
    "joiningDate" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "resignationDate" TIMESTAMP WITH TIME ZONE,
    "isActive" BOOLEAN DEFAULT true NOT NULL,
    "photoUrl" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX "idx_faculties_role_active" ON "faculties"("role", "isActive");

-- 5. Student Profile Table
CREATE TABLE "students" (
    "id" VARCHAR(30) PRIMARY KEY,
    "userId" VARCHAR(30) UNIQUE NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
    "rollNo" INT NOT NULL,
    "firstName" VARCHAR(50) NOT NULL,
    "middleName" VARCHAR(50),
    "lastName" VARCHAR(50) NOT NULL,
    "fullName" VARCHAR(150) NOT NULL,
    "standard" "Standard" NOT NULL,
    "division" "Division" NOT NULL,
    "streamGroup" "StreamGroup" NOT NULL,
    "admissionDate" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "contactNo" VARCHAR(20) NOT NULL,
    "email" VARCHAR(100),
    "avatarUrl" TEXT,
    "schoolName" VARCHAR(150) DEFAULT 'Shree Vidya Vihar Science School' NOT NULL,
    "status" "StudentStatus" DEFAULT 'ACTIVE' NOT NULL,
    "graduationYear" INT,
    "currentPursuit" VARCHAR(100),
    "endingDate" TIMESTAMP WITH TIME ZONE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "uq_student_std_div_roll" UNIQUE ("standard", "division", "rollNo")
);
CREATE INDEX "idx_students_std_div_grp_status" ON "students"("standard", "division", "streamGroup", "status");

-- 6. Subjects, Chapters, Topics & Subtopics
CREATE TABLE "subjects" (
    "id" VARCHAR(30) PRIMARY KEY,
    "code" "SubjectCode" UNIQUE NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "isCoreScience" BOOLEAN DEFAULT true NOT NULL,
    "applicableGroup" "StreamGroup"
);

CREATE TABLE "chapters" (
    "id" VARCHAR(30) PRIMARY KEY,
    "subjectId" VARCHAR(30) NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
    "standard" "Standard" NOT NULL,
    "chapterNo" INT NOT NULL,
    "chapterName" VARCHAR(150) NOT NULL,
    "description" TEXT,
    CONSTRAINT "uq_chapter_subject_std_no" UNIQUE ("subjectId", "standard", "chapterNo")
);
CREATE INDEX "idx_chapters_std_sub" ON "chapters"("standard", "subjectId");

CREATE TABLE "topics" (
    "id" VARCHAR(30) PRIMARY KEY,
    "chapterId" VARCHAR(30) NOT NULL REFERENCES "chapters"("id") ON DELETE CASCADE,
    "topicNo" VARCHAR(20) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "estimatedHours" FLOAT,
    CONSTRAINT "uq_topic_chapter_no" UNIQUE ("chapterId", "topicNo")
);

CREATE TABLE "subtopics" (
    "id" VARCHAR(30) PRIMARY KEY,
    "topicId" VARCHAR(30) NOT NULL REFERENCES "topics"("id") ON DELETE CASCADE,
    "name" VARCHAR(200) NOT NULL,
    "sampleQuestion" TEXT,
    "marks" FLOAT
);

-- Syllabus Topic Completion (Marked "Finished" by Subject Faculty)
CREATE TABLE "syllabus_completions" (
    "id" VARCHAR(30) PRIMARY KEY,
    "topicId" VARCHAR(30) NOT NULL REFERENCES "topics"("id") ON DELETE CASCADE,
    "facultyId" VARCHAR(30) NOT NULL REFERENCES "faculties"("id"),
    "standard" "Standard" NOT NULL,
    "division" "Division" NOT NULL,
    "completedDate" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "isFinished" BOOLEAN DEFAULT true NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "uq_syllabus_topic_std_div" UNIQUE ("topicId", "standard", "division")
);
CREATE INDEX "idx_syllabus_std_div_date" ON "syllabus_completions"("standard", "division", "completedDate");

CREATE TABLE "faculty_subject_allocations" (
    "id" VARCHAR(30) PRIMARY KEY,
    "facultyId" VARCHAR(30) NOT NULL REFERENCES "faculties"("id") ON DELETE CASCADE,
    "subjectId" VARCHAR(30) NOT NULL REFERENCES "subjects"("id") ON DELETE CASCADE,
    "standard" "Standard" NOT NULL,
    "division" "Division" NOT NULL,
    "academicYear" VARCHAR(20) NOT NULL,
    CONSTRAINT "uq_faculty_alloc" UNIQUE ("facultyId", "subjectId", "standard", "division", "academicYear")
);

-- 7. Lecture Test (LT) Tables
CREATE TABLE "lecture_tests" (
    "id" VARCHAR(30) PRIMARY KEY,
    "ltNo" INT NOT NULL,
    "date" TIMESTAMP WITH TIME ZONE NOT NULL,
    "standard" "Standard" NOT NULL,
    "division" "Division",
    "streamGroup" "StreamGroup",
    "subjectId" VARCHAR(30) NOT NULL REFERENCES "subjects"("id"),
    "timeMinutes" INT DEFAULT 15 NOT NULL,
    "totalMarks" FLOAT DEFAULT 20 NOT NULL,
    "status" "LtStatus" DEFAULT 'PENDING_EVALUATION' NOT NULL,
    "createdById" VARCHAR(30) NOT NULL REFERENCES "faculties"("id"),
    "assignedAssistantId" VARCHAR(30) REFERENCES "faculties"("id"),
    "questionDetails" TEXT,
    "solutionFileUrl" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX "idx_lt_std_date_sub_status" ON "lecture_tests"("standard", "date", "subjectId", "status");

CREATE TABLE "lt_topic_coverages" (
    "id" VARCHAR(30) PRIMARY KEY,
    "ltId" VARCHAR(30) NOT NULL REFERENCES "lecture_tests"("id") ON DELETE CASCADE,
    "topicId" VARCHAR(30) NOT NULL REFERENCES "topics"("id") ON DELETE CASCADE,
    CONSTRAINT "uq_lt_topic" UNIQUE ("ltId", "topicId")
);

CREATE TABLE "lt_mark_entries" (
    "id" VARCHAR(30) PRIMARY KEY,
    "ltId" VARCHAR(30) NOT NULL REFERENCES "lecture_tests"("id") ON DELETE CASCADE,
    "studentId" VARCHAR(30) NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
    "scoreGrade" "LtGrade" DEFAULT 'GOOD' NOT NULL,
    "numericScore" FLOAT,
    "isAbsent" BOOLEAN DEFAULT false NOT NULL,
    "evaluatedById" VARCHAR(30) NOT NULL REFERENCES "faculties"("id"),
    "evaluatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "remarks" TEXT,
    "isWeakTopic" BOOLEAN DEFAULT false NOT NULL,
    CONSTRAINT "uq_lt_student" UNIQUE ("ltId", "studentId")
);
CREATE INDEX "idx_lt_marks_student_weak" ON "lt_mark_entries"("studentId", "isWeakTopic");

-- 8. Exam Module Tables
CREATE TABLE "exams" (
    "id" VARCHAR(30) PRIMARY KEY,
    "examNo" INT UNIQUE NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "examType" "ExamType" NOT NULL,
    "standard" "Standard" NOT NULL,
    "division" "Division",
    "applicableGroup" "StreamGroup",
    "subject" VARCHAR(100) NOT NULL,
    "date" TIMESTAMP WITH TIME ZONE NOT NULL,
    "startTime" TIMESTAMP WITH TIME ZONE,
    "endTime" TIMESTAMP WITH TIME ZONE,
    "totalMarks" FLOAT NOT NULL,
    "passingMarks" FLOAT,
    "unitCoverageSummary" TEXT NOT NULL,
    "questionPaperUrl" TEXT,
    "status" "ExamStatus" DEFAULT 'UPCOMING' NOT NULL,
    "createdById" VARCHAR(30) NOT NULL REFERENCES "faculties"("id"),
    "conductedById" VARCHAR(30) REFERENCES "faculties"("id"),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX "idx_exams_std_date_type_status" ON "exams"("standard", "date", "examType", "status");

CREATE TABLE "exam_unit_coverages" (
    "id" VARCHAR(30) PRIMARY KEY,
    "examId" VARCHAR(30) NOT NULL REFERENCES "exams"("id") ON DELETE CASCADE,
    "chapterId" VARCHAR(30) NOT NULL REFERENCES "chapters"("id") ON DELETE CASCADE,
    "tillTopicId" VARCHAR(30),
    "isFullChapter" BOOLEAN DEFAULT false NOT NULL,
    "unitLabel" VARCHAR(200) NOT NULL
);

CREATE TABLE "exam_mark_entries" (
    "id" VARCHAR(30) PRIMARY KEY,
    "examId" VARCHAR(30) NOT NULL REFERENCES "exams"("id") ON DELETE CASCADE,
    "studentId" VARCHAR(30) NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
    "singleSubjectScore" FLOAT,
    "physicsScore" FLOAT,
    "chemistryScore" FLOAT,
    "mathsScore" FLOAT,
    "biologyScore" FLOAT,
    "totalScore" FLOAT DEFAULT 0 NOT NULL,
    "percentage" FLOAT,
    "rank" INT,
    "percentile" FLOAT,
    "isAbsent" BOOLEAN DEFAULT false NOT NULL,
    "enteredById" VARCHAR(30) NOT NULL REFERENCES "faculties"("id"),
    "enteredAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "uq_exam_student" UNIQUE ("examId", "studentId")
);
CREATE INDEX "idx_exam_marks_exam_total" ON "exam_mark_entries"("examId", "totalScore");
CREATE INDEX "idx_exam_marks_student" ON "exam_mark_entries"("studentId", "examId");

-- 9. Result Generation Tables
CREATE TABLE "result_batches" (
    "id" VARCHAR(30) PRIMARY KEY,
    "batchNo" SERIAL UNIQUE NOT NULL,
    "standard" "Standard" NOT NULL,
    "division" "Division",
    "streamGroup" "StreamGroup",
    "resultType" "ReportPeriodType" NOT NULL,
    "date" TIMESTAMP WITH TIME ZONE NOT NULL,
    "academicPeriod" VARCHAR(100) NOT NULL,
    "status" "PublishStatus" DEFAULT 'DRAFT' NOT NULL,
    "publishedAt" TIMESTAMP WITH TIME ZONE,
    "generatedById" VARCHAR(30) NOT NULL REFERENCES "faculties"("id"),
    "includedSubjects" JSONB NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX "idx_result_batches_std_type_date" ON "result_batches"("standard", "resultType", "date");

CREATE TABLE "result_items" (
    "id" VARCHAR(30) PRIMARY KEY,
    "resultBatchId" VARCHAR(30) NOT NULL REFERENCES "result_batches"("id") ON DELETE CASCADE,
    "studentId" VARCHAR(30) NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
    "totalMarksObtained" FLOAT NOT NULL,
    "maxMarks" FLOAT NOT NULL,
    "percentage" FLOAT NOT NULL,
    "classRank" INT NOT NULL,
    "overallPercentile" FLOAT NOT NULL,
    "subjectBreakdown" JSONB NOT NULL,
    "status" "PublishStatus" DEFAULT 'DRAFT' NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "uq_result_batch_student" UNIQUE ("resultBatchId", "studentId")
);

-- 10. Hall Ticket Generation Tables
CREATE TABLE "hall_ticket_batches" (
    "id" VARCHAR(30) PRIMARY KEY,
    "batchNo" SERIAL UNIQUE NOT NULL,
    "standard" "Standard" NOT NULL,
    "examType" "ExamType" NOT NULL,
    "examDate" TIMESTAMP WITH TIME ZONE NOT NULL,
    "status" "PublishStatus" DEFAULT 'DRAFT' NOT NULL,
    "generatedById" VARCHAR(30) NOT NULL REFERENCES "faculties"("id"),
    "scheduleDetails" JSONB NOT NULL,
    "formatTemplate" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX "idx_hall_ticket_std_type_date" ON "hall_ticket_batches"("standard", "examType", "examDate");

CREATE TABLE "hall_tickets" (
    "id" VARCHAR(30) PRIMARY KEY,
    "batchId" VARCHAR(30) NOT NULL REFERENCES "hall_ticket_batches"("id") ON DELETE CASCADE,
    "studentId" VARCHAR(30) NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
    "seatNumber" VARCHAR(50) NOT NULL,
    "centerName" VARCHAR(150) DEFAULT 'Shree Vidya Vihar Science School Campus' NOT NULL,
    "issuedDate" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "status" "PublishStatus" DEFAULT 'DRAFT' NOT NULL,
    CONSTRAINT "uq_hall_ticket_batch_student" UNIQUE ("batchId", "studentId")
);

-- 11. Student Progress Reports (Pre-aggregated Metrics)
CREATE TABLE "progress_reports" (
    "id" VARCHAR(30) PRIMARY KEY,
    "studentId" VARCHAR(30) NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
    "reportType" "ReportPeriodType" NOT NULL,
    "academicPeriod" VARCHAR(100) NOT NULL,
    "averageScore" FLOAT NOT NULL,
    "classAverage" FLOAT,
    "examAverage" FLOAT,
    "ltAverage" FLOAT,
    "growthVsLastPeriod" FLOAT DEFAULT 0 NOT NULL,
    "rank" INT NOT NULL,
    "rankChange" VARCHAR(20),
    "percentile" FLOAT NOT NULL,
    "peerBenchmark" VARCHAR(100),
    "consistencyScore" FLOAT,
    "topInSubjects" JSONB,
    "weakAreas" JSONB,
    "subjectAverages" JSONB,
    "trendData" JSONB,
    "summaryMessage" TEXT NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "uq_progress_student_type_period" UNIQUE ("studentId", "reportType", "academicPeriod")
);

-- 12. Student Attendance
CREATE TABLE "student_attendances" (
    "id" VARCHAR(30) PRIMARY KEY,
    "studentId" VARCHAR(30) NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
    "date" DATE NOT NULL,
    "session" "AttendanceSession" DEFAULT 'MORNING' NOT NULL,
    "status" "AttendanceStatus" DEFAULT 'PRESENT' NOT NULL,
    "markedById" VARCHAR(30),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT "uq_attendance_student_date_session" UNIQUE ("studentId", "date", "session")
);

-- 13. Discipline Remarks
CREATE TABLE "discipline_remarks" (
    "id" VARCHAR(30) PRIMARY KEY,
    "studentId" VARCHAR(30) NOT NULL REFERENCES "students"("id") ON DELETE CASCADE,
    "incidentType" "DisciplineType" NOT NULL,
    "date" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "message" TEXT NOT NULL,
    "notedById" VARCHAR(30) NOT NULL REFERENCES "faculties"("id"),
    "notedByName" VARCHAR(100) NOT NULL,
    "standard" "Standard" NOT NULL,
    "division" "Division" NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX "idx_discipline_student_date" ON "discipline_remarks"("studentId", "date");

-- 14. Notices
CREATE TABLE "notices" (
    "id" VARCHAR(30) PRIMARY KEY,
    "srNo" SERIAL UNIQUE NOT NULL,
    "title" VARCHAR(150) NOT NULL,
    "message" TEXT NOT NULL,
    "targetRole" "Role",
    "targetStandard" "Standard",
    "date" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "createdById" VARCHAR(30) REFERENCES "principals"("id"),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);
CREATE INDEX "idx_notices_date_role" ON "notices"("date", "targetRole");

