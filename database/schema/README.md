# School Management System (SMS) — MongoDB Database Architecture

## 1. Overview
The database layer for the 11th–12th Science Stream School Management System is powered by **MongoDB** (`mongodb://127.0.0.1:27017/sms_db`) with **Mongoose** as the Object-Document Mapper (ODM).

All CRUD operations across the dashboard (Principal, Faculty, Assistant Faculty, Student) are performed **directly in MongoDB collections** with automatic validation and indexes.

---

## 2. Roles & Academic Structure
- **Roles**:
  - `STUDENT`: Science stream students (Group A, B, AB)
  - `SUBJECT_FACULTY`: Conducts daily lectures, marks syllabus completion, sets LT (Learning Tests), prepares exam question papers
  - `ASSISTANT_FACULTY`: Lab sessions, conducts tests/exams, evaluates LT tests (Excellent/Good/Poor), enters exam marks
  - `PRINCIPAL`: Administrative oversight, student & faculty management, analytics, notices, discipline remarks
- **Academic Standards**:
  - `STD_11` (Standard 11 Science)
  - `STD_12` (Standard 12 Science)
- **Science Stream Groups**:
  - `GROUP_A`: Physics, Chemistry, Mathematics (PCM — Engineering / JEE Track)
  - `GROUP_B`: Physics, Chemistry, Biology (PCB — Medical / NEET Track)
  - `GROUP_AB`: Physics, Chemistry, Mathematics, Biology (PCMB Combined Track)

---

## 3. Collections & Schemas

### `students` Collection
Stores both currently enrolled active students and alumni records.
- `rollNo`: Number, required (indexed per standard + division)
- `firstName`, `middleName`, `lastName`: String
- `fullName`: String (auto-computed)
- `standard`: `STD_11` | `STD_12`
- `division`: `A` | `B` | `C` | `D`
- `streamGroup`: `GROUP_A` | `GROUP_B` | `GROUP_AB`
- `admissionDate`: Date
- `contactNo`: String
- `email`: String
- `status`: `ACTIVE` | `ALUMNI`
- `schoolName`: String
- `attendancePercent`: Number
- `graduationYear`: Number (for alumni)
- `currentPursuit`: String (university / degree for alumni)
- `endingDate`: Date
- **Indexes**: `{ standard: 1, division: 1, rollNo: 1 }` (unique compound index)

### `faculties` Collection
Stores teaching personnel (Subject Faculty & Assistant Faculty).
- `empCode`: String (unique employee code, e.g. `FAC101`)
- `firstName`, `middleName`, `lastName`, `fullName`: String
- `role`: `Subject Faculty` | `Assistant Faculty` | `Principal`
- `subject`: String (e.g. Physics, Chemistry, Mathematics, Biology, Lab)
- `qualification`: String
- `contactNo`: String
- `email`: String
- `joiningDate`: Date
- `status`: `ACTIVE` | `DEACTIVATED`
- `experience`: String
- `resignationDate`: Date

### `lts` Collection (Daily Learning Tests)
- `title`: String
- `subject`: String
- `standard`: `STD_11` | `STD_12`
- `division`: String
- `streamGroup`: `GROUP_A` | `GROUP_B` | `GROUP_AB` | `ALL`
- `examDate`: Date
- `time`: String
- `topicsCovered`: [String]
- `questions`: `[{ questionNo: Number, questionText: String, marks: Number }]`
- `subjectFacultyId`: ObjectId ref `faculties`
- `status`: `SCHEDULED` | `CONDUCTED` | `EVALUATED`

### `ltmarks` Collection
- `ltId`: ObjectId ref `lts`
- `studentId`: ObjectId ref `students`
- `assistantFacultyId`: ObjectId ref `faculties`
- `grade`: `EXCELLENT` | `GOOD` | `POOR`
- `marksObtained`: Number
- `totalMarks`: Number
- `remarks`: String
- `evaluatedAt`: Date

### `examunits` Collection
- `title`: String
- `examType`: `BOARD` | `JEE` | `NEET` | `GUJCET` | `ANNUAL` | `WEEKLY` | `OTHER`
- `subject`: String
- `standard`: `STD_11` | `STD_12`
- `division`: String
- `examDate`: Date
- `totalMarks`: Number
- `questionPaperPdfUrl`: String
- `createdByFacultyId`: ObjectId ref `faculties`
- `chapters`: `[{ chapterNo: Number, chapterName: String, topics: [String] }]`
- `status`: `SCHEDULED` | `CONDUCTED` | `MARKS_ENTERED` | `RESULT_PUBLISHED`

### `exammarks` Collection
- `examId`: ObjectId ref `examunits`
- `studentId`: ObjectId ref `students`
- `enteredByAssistantFacultyId`: ObjectId ref `faculties`
- `subjectMarks`: `[{ subject: String, marksObtained: Number, totalMarks: Number }]`
  - Board exam: 1 subject mark
  - JEE/GUJCET (Group A): Physics, Chemistry, Maths
  - NEET/GUJCET (Group B): Physics, Chemistry, Biology
- `totalObtained`: Number
- `totalMaxMarks`: Number
- `percentage`: Number
- `enteredAt`: Date

---

## 4. Seeding & Running

### Starting Backend:
```bash
cd backend
npm start
```
Starts Express API on `http://localhost:5000` connected to MongoDB on `mongodb://127.0.0.1:27017/sms_db`.

### Reseeding MongoDB:
```bash
npm run seed:mongo
```
Populates `sms_db` with demo students and faculties.

