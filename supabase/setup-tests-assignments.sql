-- TESTS & ASSIGNMENTS SYSTEM
-- This schema supports comprehensive test/assignment creation with multiple question types

-- TESTS TABLE (assignments/exams created by teachers)
CREATE TABLE IF NOT EXISTS public.tests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  subject TEXT,
  total_points INTEGER DEFAULT 100 NOT NULL,
  time_limit INTEGER, -- in minutes, NULL means no time limit
  due_date TIMESTAMP WITH TIME ZONE,
  is_published BOOLEAN DEFAULT false NOT NULL,
  allow_late_submission BOOLEAN DEFAULT false NOT NULL,
  show_results_immediately BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.tests ENABLE ROW LEVEL SECURITY;

-- Teachers can manage their own tests
CREATE POLICY "Teachers can view own tests"
  ON public.tests FOR SELECT
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can create tests"
  ON public.tests FOR INSERT
  WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update own tests"
  ON public.tests FOR UPDATE
  USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete own tests"
  ON public.tests FOR DELETE
  USING (auth.uid() = teacher_id);

-- Students can view published tests
CREATE POLICY "Students can view published tests"
  ON public.tests FOR SELECT
  USING (is_published = true);

-- TEST QUESTIONS TABLE
CREATE TABLE IF NOT EXISTS public.test_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE NOT NULL,
  question_order INTEGER NOT NULL,
  question_type TEXT NOT NULL CHECK (question_type IN ('mcq', 'multiple_response', 'short_answer', 'essay', 'true_false')),
  question_text TEXT NOT NULL,
  question_image_url TEXT, -- optional image for the question
  points INTEGER DEFAULT 1 NOT NULL,
  correct_answer TEXT, -- for mcq/true_false: the correct option; for short_answer: expected answer
  options JSONB, -- for mcq/multiple_response: array of options
  explanation TEXT, -- optional explanation shown after submission
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.test_questions ENABLE ROW LEVEL SECURITY;

-- Teachers can manage questions for their tests
CREATE POLICY "Teachers can manage test questions"
  ON public.test_questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tests
      WHERE tests.id = test_questions.test_id
      AND tests.teacher_id = auth.uid()
    )
  );

-- Students can view questions for published tests
CREATE POLICY "Students can view published test questions"
  ON public.test_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tests
      WHERE tests.id = test_questions.test_id
      AND tests.is_published = true
    )
  );

-- TEST SUBMISSIONS TABLE
CREATE TABLE IF NOT EXISTS public.test_submissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  test_id UUID REFERENCES public.tests(id) ON DELETE CASCADE NOT NULL,
  student_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  submitted_at TIMESTAMP WITH TIME ZONE,
  score NUMERIC(5,2), -- calculated score
  total_points INTEGER, -- total possible points at time of submission
  is_graded BOOLEAN DEFAULT false NOT NULL,
  time_taken INTEGER, -- in seconds
  UNIQUE(test_id, student_id) -- one submission per student per test
);

ALTER TABLE public.test_submissions ENABLE ROW LEVEL SECURITY;

-- Students can view own submissions
CREATE POLICY "Students can view own submissions"
  ON public.test_submissions FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Students can create own submissions"
  ON public.test_submissions FOR INSERT
  WITH CHECK (auth.uid() = student_id);

CREATE POLICY "Students can update own submissions"
  ON public.test_submissions FOR UPDATE
  USING (auth.uid() = student_id);

-- Teachers can view submissions for their tests
CREATE POLICY "Teachers can view submissions for their tests"
  ON public.test_submissions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.tests
      WHERE tests.id = test_submissions.test_id
      AND tests.teacher_id = auth.uid()
    )
  );

-- Teachers can update submissions (for grading)
CREATE POLICY "Teachers can grade submissions"
  ON public.test_submissions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.tests
      WHERE tests.id = test_submissions.test_id
      AND tests.teacher_id = auth.uid()
    )
  );

-- TEST ANSWERS TABLE (student answers to each question)
CREATE TABLE IF NOT EXISTS public.test_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID REFERENCES public.test_submissions(id) ON DELETE CASCADE NOT NULL,
  question_id UUID REFERENCES public.test_questions(id) ON DELETE CASCADE NOT NULL,
  answer_text TEXT, -- student's answer
  is_correct BOOLEAN, -- auto-graded for mcq/true_false
  points_earned NUMERIC(5,2), -- points awarded (for manual grading)
  teacher_feedback TEXT, -- optional feedback from teacher
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(submission_id, question_id)
);

ALTER TABLE public.test_answers ENABLE ROW LEVEL SECURITY;

-- Students can manage their own answers
CREATE POLICY "Students can manage own answers"
  ON public.test_answers FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.test_submissions
      WHERE test_submissions.id = test_answers.submission_id
      AND test_submissions.student_id = auth.uid()
    )
  );

-- Teachers can view and grade answers for their tests
CREATE POLICY "Teachers can view answers for their tests"
  ON public.test_answers FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.test_submissions ts
      JOIN public.tests t ON t.id = ts.test_id
      WHERE ts.id = test_answers.submission_id
      AND t.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Teachers can grade answers"
  ON public.test_answers FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.test_submissions ts
      JOIN public.tests t ON t.id = ts.test_id
      WHERE ts.id = test_answers.submission_id
      AND t.teacher_id = auth.uid()
    )
  );

-- INDEXES FOR PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_tests_teacher_id ON public.tests(teacher_id);
CREATE INDEX IF NOT EXISTS idx_tests_is_published ON public.tests(is_published);
CREATE INDEX IF NOT EXISTS idx_test_questions_test_id ON public.test_questions(test_id);
CREATE INDEX IF NOT EXISTS idx_test_submissions_test_id ON public.test_submissions(test_id);
CREATE INDEX IF NOT EXISTS idx_test_submissions_student_id ON public.test_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_test_answers_submission_id ON public.test_answers(submission_id);

-- FUNCTION TO AUTO-UPDATE updated_at
CREATE OR REPLACE FUNCTION public.handle_tests_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS handle_tests_updated_at ON public.tests;
CREATE TRIGGER handle_tests_updated_at
  BEFORE UPDATE ON public.tests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_tests_updated_at();

-- FUNCTION TO AUTO-GRADE MCQ/TRUE_FALSE QUESTIONS
CREATE OR REPLACE FUNCTION public.auto_grade_answer()
RETURNS TRIGGER AS $$
DECLARE
  question_record RECORD;
  correct_answer_text TEXT;
BEGIN
  -- Get question details
  SELECT tq.question_type, tq.correct_answer, tq.points
  INTO question_record
  FROM public.test_questions tq
  WHERE tq.id = NEW.question_id;

  -- Auto-grade for MCQ and True/False
  IF question_record.question_type IN ('mcq', 'true_false') THEN
    IF LOWER(TRIM(NEW.answer_text)) = LOWER(TRIM(question_record.correct_answer)) THEN
      NEW.is_correct := true;
      NEW.points_earned := question_record.points;
    ELSE
      NEW.is_correct := false;
      NEW.points_earned := 0;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS auto_grade_answer_trigger ON public.test_answers;
CREATE TRIGGER auto_grade_answer_trigger
  BEFORE INSERT OR UPDATE ON public.test_answers
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_grade_answer();

-- FUNCTION TO CALCULATE SUBMISSION SCORE
CREATE OR REPLACE FUNCTION public.calculate_submission_score()
RETURNS TRIGGER AS $$
DECLARE
  total_score NUMERIC(5,2);
  total_possible INTEGER;
BEGIN
  -- Calculate total earned points
  SELECT COALESCE(SUM(points_earned), 0)
  INTO total_score
  FROM public.test_answers
  WHERE submission_id = NEW.submission_id;

  -- Get total possible points
  SELECT total_points
  INTO total_possible
  FROM public.tests t
  JOIN public.test_submissions ts ON ts.test_id = t.id
  WHERE ts.id = NEW.submission_id;

  -- Update submission
  UPDATE public.test_submissions
  SET score = total_score,
      total_points = total_possible
  WHERE id = NEW.submission_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS calculate_score_trigger ON public.test_answers;
CREATE TRIGGER calculate_score_trigger
  AFTER INSERT OR UPDATE ON public.test_answers
  FOR EACH ROW
  EXECUTE FUNCTION public.calculate_submission_score();
