# Tests & Assignments System - Setup Guide

## 📋 Overview

A comprehensive testing and assignment system for teachers and students with features including:
- Multiple question types (MCQ, Multiple Response, True/False, Short Answer, Essay)
- Image support for questions
- Auto-grading for objective questions
- Manual grading for subjective questions
- Time limits and due dates
- Real-time score calculation
- Detailed reports and analytics
- CSV export functionality

---

## 🗄️ Database Setup

### Step 1: Run the SQL Migration

Execute the SQL file in your Supabase SQL Editor:

```bash
# The migration file is located at:
/workspaces/studyspaceV2/supabase/setup-tests-assignments.sql
```

1. Go to your Supabase project dashboard
2. Navigate to SQL Editor
3. Copy the contents of `setup-tests-assignments.sql`
4. Paste and run the SQL script

This will create:
- `tests` table - Stores test/assignment information
- `test_questions` table - Stores individual questions
- `test_submissions` table - Tracks student submissions
- `test_answers` table - Stores student answers
- Row Level Security (RLS) policies
- Auto-grading triggers
- Score calculation functions

### Step 2: Create Storage Bucket for Test Images

1. Go to Storage in Supabase dashboard
2. Create a new bucket called `test-images`
3. Make it **public** (or configure policies as needed)
4. Add the following storage policies:

```sql
-- Allow authenticated users to upload images
CREATE POLICY "Authenticated users can upload test images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'test-images');

-- Allow public read access
CREATE POLICY "Public read access for test images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'test-images');

-- Allow teachers to delete their images
CREATE POLICY "Teachers can delete own images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'test-images');
```

---

## 🎯 Features Implemented

### For Teachers/Admins:

#### 1. Tests Management Page (`/tests`)
- View all created tests
- See statistics (total tests, published, submissions)
- Quick actions: edit, view reports, publish/unpublish, delete
- Filter by status

#### 2. Test Creation/Edit Page (`/tests/create` and `/tests/edit/:testId`)
- Comprehensive test builder with:
  - Basic details (title, description, subject)
  - Time limits and due dates
  - Point allocation
  - Publishing controls
  
- Question builder supporting:
  - **Multiple Choice (Single)** - Traditional MCQ
  - **Multiple Choice (Multiple)** - Select multiple correct answers
  - **True/False** - Binary choice
  - **Short Answer** - Text input for brief responses
  - **Essay** - Long-form text responses
  
- Features per question:
  - Rich text question editor
  - Image upload support
  - Custom point values
  - Correct answer specification
  - Answer explanations
  - Drag-and-drop reordering

#### 3. Reports Page (`/tests/reports/:testId`)
- Comprehensive analytics:
  - Total submissions
  - Average score
  - Highest score
  - Pass rate
  
- Detailed submission view:
  - Student-by-student breakdown
  - Individual answer review
  - Manual grading for essay/short answer
  - Add teacher feedback
  - Export to CSV

### For Students:

#### 1. Available Tests (Dashboard)
- See all published tests
- View due dates and status
- Quick access to start tests
- See completed test scores

#### 2. Test Taking Page (`/tests/take/:testId`)
- Clean, distraction-free interface
- Timer countdown (if time limit set)
- Progress indicator
- Auto-save answers
- Submit confirmation dialog
- Immediate results (if enabled)

---

## 🚀 Usage

### For Teachers:

1. **Create a Test:**
   - Navigate to "Tests & Assignments" in sidebar
   - Click "Create New Test"
   - Fill in test details
   - Add questions with "Add Question" button
   - Configure each question:
     - Select question type
     - Enter question text
     - Upload image (optional)
     - Add answer options (for MCQ)
     - Set correct answer
     - Add explanation (optional)
   - Click "Save Test"

2. **Publish a Test:**
   - From Tests Management page
   - Click "Publish" button on desired test
   - Students can now see and take the test

3. **View Reports:**
   - Click "View Reports" on any test
   - See overall statistics
   - Click "View Details" on any submission
   - Grade essay/short answer questions
   - Add feedback for students
   - Export results to CSV

### For Students:

1. **Take a Test:**
   - See available tests on Dashboard
   - Click "Start Test" button
   - Answer all questions
   - Submit when ready
   - View results immediately (if enabled)

2. **View Scores:**
   - Completed tests show scores on Dashboard
   - Percentage calculation included
   - See submission timestamp

---

## 🔧 Technical Details

### Auto-Grading System

The system automatically grades:
- **MCQ** - Compares selected answer with correct answer
- **True/False** - Exact match with correct answer
- **Multiple Response** - Checks all selected options

Manual grading required for:
- **Short Answer** - Teacher reviews and assigns points
- **Essay** - Teacher reviews and assigns points

### Score Calculation

Scores are calculated using database triggers:
1. When student submits answer → trigger checks if auto-gradable
2. If yes → calculates `is_correct` and `points_earned`
3. Aggregate trigger → sums all `points_earned` for total score
4. Updates `test_submissions.score` automatically

### Security

- Row Level Security (RLS) enabled on all tables
- Teachers can only manage their own tests
- Students can only view published tests
- Students can only submit once per test
- Storage policies control image access

---

## 📊 Database Schema

```
tests
├── id (uuid, PK)
├── teacher_id (uuid, FK → profiles)
├── title (text)
├── description (text)
├── subject (text)
├── total_points (integer)
├── time_limit (integer, minutes)
├── due_date (timestamp)
├── is_published (boolean)
├── allow_late_submission (boolean)
└── show_results_immediately (boolean)

test_questions
├── id (uuid, PK)
├── test_id (uuid, FK → tests)
├── question_order (integer)
├── question_type (enum)
├── question_text (text)
├── question_image_url (text)
├── points (integer)
├── correct_answer (text)
├── options (jsonb)
└── explanation (text)

test_submissions
├── id (uuid, PK)
├── test_id (uuid, FK → tests)
├── student_id (uuid, FK → profiles)
├── started_at (timestamp)
├── submitted_at (timestamp)
├── score (numeric)
├── total_points (integer)
├── is_graded (boolean)
└── time_taken (integer, seconds)

test_answers
├── id (uuid, PK)
├── submission_id (uuid, FK → test_submissions)
├── question_id (uuid, FK → test_questions)
├── answer_text (text)
├── is_correct (boolean)
├── points_earned (numeric)
└── teacher_feedback (text)
```

---

## 🎨 UI Components Created

1. **TestsManagement.tsx** - Main dashboard for teachers
2. **TestCreation.tsx** - Comprehensive test builder
3. **TakeTest.tsx** - Student test-taking interface
4. **TestReports.tsx** - Analytics and grading interface
5. **AvailableTests.tsx** - Student dashboard component

---

## 🔄 Navigation Updates

### Sidebar (for Admins/Teachers only):
- New "Teacher Tools" section
- "Tests & Assignments" link
- "Admin Panel" link

### Routes Added:
- `/tests` - Tests management
- `/tests/create` - Create new test
- `/tests/edit/:testId` - Edit existing test
- `/tests/take/:testId` - Take a test (students)
- `/tests/reports/:testId` - View test reports

---

## ✅ Next Steps

1. Run the SQL migration in Supabase
2. Create the `test-images` storage bucket
3. Test the system:
   - Create a test as a teacher
   - Publish it
   - Take it as a student
   - Review reports as a teacher
4. Customize styling if needed
5. Add more question types if desired

---

## 🐛 Troubleshooting

### Issue: Images not uploading
- Check storage bucket exists and is named `test-images`
- Verify storage policies are in place
- Check file size limits

### Issue: Students can't see tests
- Ensure test is published (`is_published = true`)
- Check RLS policies are active
- Verify student is authenticated

### Issue: Scores not calculating
- Check database triggers are active:
  - `auto_grade_answer_trigger`
  - `calculate_score_trigger`
- Verify `correct_answer` is set for auto-gradable questions

---

## 📝 Future Enhancements

Consider adding:
- Question banks for reusability
- Randomized question order
- Question pools (random selection)
- Timed questions (individual timers)
- Question categories/tags
- Test templates
- Peer review system
- Discussion forums per test
- Analytics dashboard
- Email notifications
- Mobile app support

---

## 🎓 Credits

Built for StudySpaceV2 - An all-in-one productivity and social platform for students.
