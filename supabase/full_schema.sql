-- PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  location TEXT,
  website TEXT,
  github TEXT,
  twitter TEXT,
  linkedin TEXT,
  streak INTEGER DEFAULT 0 NOT NULL,
  points INTEGER DEFAULT 0 NOT NULL,
  rank INTEGER DEFAULT 0 NOT NULL,
  is_public BOOLEAN DEFAULT true NOT NULL,
  is_admin BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- NOTES TABLE
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  subject TEXT,
  is_public BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public notes and own notes"
  ON public.notes FOR SELECT
  USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can create own notes"
  ON public.notes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notes"
  ON public.notes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notes"
  ON public.notes FOR DELETE
  USING (auth.uid() = user_id);

-- NOTE ATTACHMENTS TABLE
CREATE TABLE IF NOT EXISTS public.note_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.note_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments for notes they can access"
  ON public.note_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.notes
      WHERE notes.id = note_attachments.note_id
      AND (notes.is_public = true OR notes.user_id = auth.uid())
    )
  );

CREATE POLICY "Users can create attachments for own notes"
  ON public.note_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.notes
      WHERE notes.id = note_attachments.note_id
      AND notes.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete attachments from own notes"
  ON public.note_attachments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.notes
      WHERE notes.id = note_attachments.note_id
      AND notes.user_id = auth.uid()
    )
  );

-- TASKS TABLE
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT false NOT NULL,
  due_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tasks"
  ON public.tasks FOR SELECT
  USING (true);

CREATE POLICY "Users can create own tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tasks"
  ON public.tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own tasks"
  ON public.tasks FOR DELETE
  USING (auth.uid() = user_id);

-- TASK ATTACHMENTS TABLE
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view task attachments"
  ON public.task_attachments FOR SELECT
  USING (true);

CREATE POLICY "Users can create attachments for own tasks"
  ON public.task_attachments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_attachments.task_id
      AND tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete attachments from own tasks"
  ON public.task_attachments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_attachments.task_id
      AND tasks.user_id = auth.uid()
    )
  );

-- FRIENDSHIPS TABLE
CREATE TABLE IF NOT EXISTS public.friendships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  friend_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected')) DEFAULT 'pending' NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  UNIQUE(user_id, friend_id)
);

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their friendships"
  ON public.friendships FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friendships"
  ON public.friendships FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update friendships they're part of"
  ON public.friendships FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can delete own friendship requests"
  ON public.friendships FOR DELETE
  USING (auth.uid() = user_id);

-- DIRECT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  read BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view messages sent to them or by them"
  ON public.direct_messages FOR SELECT
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

CREATE POLICY "Users can send messages"
  ON public.direct_messages FOR INSERT
  WITH CHECK (auth.uid() = from_user_id);

CREATE POLICY "Users can update messages sent to them"
  ON public.direct_messages FOR UPDATE
  USING (auth.uid() = to_user_id);

CREATE POLICY "Users can delete their own sent messages"
  ON public.direct_messages FOR DELETE
  USING (auth.uid() = from_user_id);

-- CHAT MESSAGES TABLE (GENERAL CHAT)
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view chat messages"
  ON public.chat_messages FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can send chat messages"
  ON public.chat_messages FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own chat messages"
  ON public.chat_messages FOR DELETE
  USING (auth.uid() = user_id);

-- Enable realtime for chat and direct messages
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;

-- TRIGGERS AND FUNCTIONS FOR UPDATED_AT
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER handle_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- FUNCTION AND TRIGGER FOR NEW USER SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    NEW.email
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- FUNCTION: get_dm_conversations (for DM list)
-- This must be created after all tables exist
create or replace function public.get_dm_conversations(user_id uuid)
returns table (
  id uuid,
  username text,
  email text
)
language sql
as $$
  select p.id, p.username, p.email
  from public.profiles p
  where p.id in (
    select
      case
        when dm.from_user_id = user_id then dm.to_user_id
        else dm.from_user_id
      end as other_user_id
    from public.direct_messages dm
    where dm.from_user_id = user_id or dm.to_user_id = user_id
    group by other_user_id
  )
  and p.id != user_id
$$;

-- SETTINGS TABLE (For admin controls)
CREATE TABLE IF NOT EXISTS public.settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notes_locked BOOLEAN DEFAULT false NOT NULL,
  ai_locked BOOLEAN DEFAULT false NOT NULL,
  chat_locked BOOLEAN DEFAULT false NOT NULL,
  tasks_locked BOOLEAN DEFAULT false NOT NULL,
  study_rooms_locked BOOLEAN DEFAULT false NOT NULL,
  whiteboard_locked BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view settings"
  ON public.settings FOR SELECT
  USING (true);

CREATE POLICY "Only admins can insert settings"
  ON public.settings FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE is_admin = true
    )
  );

CREATE POLICY "Only admins can update settings"
  ON public.settings FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE is_admin = true
    )
  );

-- Insert default settings
INSERT INTO public.settings (notes_locked, ai_locked, chat_locked, tasks_locked, study_rooms_locked)
VALUES (false, false, false, false, false)
ON CONFLICT DO NOTHING;

-- Enforce that settings has at most one row
CREATE UNIQUE INDEX IF NOT EXISTS only_one_settings_row ON public.settings ((true));

-- STUDY ROOMS TABLE
CREATE TABLE IF NOT EXISTS public.study_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_code TEXT UNIQUE NOT NULL,
  created_by UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  room_name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true NOT NULL,
  max_participants INTEGER DEFAULT 10 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.study_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all active study rooms"
  ON public.study_rooms FOR SELECT
  USING (is_active = true);

CREATE POLICY "Room creators can update their own rooms"
  ON public.study_rooms FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Users can create rooms"
  ON public.study_rooms FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Room creators can delete their own rooms"
  ON public.study_rooms FOR DELETE
  USING (auth.uid() = created_by);

-- ROOM PARTICIPANTS TABLE
CREATE TABLE IF NOT EXISTS public.room_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.study_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  left_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true NOT NULL,
  UNIQUE(room_id, user_id)
);

ALTER TABLE public.room_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view participants in active rooms"
  ON public.room_participants FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.study_rooms
      WHERE id = room_id AND is_active = true
    )
  );

CREATE POLICY "Users can join rooms"
  ON public.room_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own participation"
  ON public.room_participants FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can leave rooms"
  ON public.room_participants FOR DELETE
  USING (auth.uid() = user_id);

-- ROOM CHAT TABLE
CREATE TABLE IF NOT EXISTS public.room_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.study_rooms(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.room_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view chat in their joined rooms"
  ON public.room_chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.room_participants
      WHERE room_id = room_chat_messages.room_id
        AND user_id = auth.uid()
        AND is_active = true
    )
  );

CREATE POLICY "Users can send messages in their rooms"
  ON public.room_chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.room_participants
      WHERE room_id = room_chat_messages.room_id
        AND user_id = auth.uid()
        AND is_active = true
    )
  );

-- WEBRTC SIGNALING TABLE
CREATE TABLE IF NOT EXISTS public.webrtc_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id UUID REFERENCES public.study_rooms(id) ON DELETE CASCADE NOT NULL,
  from_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  to_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  signal_type TEXT CHECK (signal_type IN ('offer', 'answer', 'ice-candidate')) NOT NULL,
  signal_data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.webrtc_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view signals in their rooms"
  ON public.webrtc_signals FOR SELECT
  USING (
    auth.uid() = from_user_id OR auth.uid() = to_user_id
  );

CREATE POLICY "Users can send signals in their rooms"
  ON public.webrtc_signals FOR INSERT
  WITH CHECK (
    auth.uid() = from_user_id AND
    EXISTS (
      SELECT 1 FROM public.room_participants
      WHERE room_id = webrtc_signals.room_id
        AND user_id = auth.uid()
        AND is_active = true
    )
  );

CREATE POLICY "Users can delete their own signals"
  ON public.webrtc_signals FOR DELETE
  USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);

-- Enable realtime for WebRTC signaling, study rooms, and admin controls (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'webrtc_signals'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.webrtc_signals';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'room_participants'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.room_participants';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'room_chat_messages'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.room_chat_messages';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'study_rooms'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.study_rooms';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'settings'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.settings';
  END IF;
END$$;

-- STORAGE BUCKETS
-- Create storage bucket for avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for avatars
DROP POLICY IF EXISTS "Authenticated users can read avatars" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own avatar" ON storage.objects;

CREATE POLICY "Authenticated users can read avatars"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars' AND auth.role() = 'authenticated');

CREATE POLICY "Users can upload their own avatar"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update their own avatar"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete their own avatar"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'avatars' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================================
-- TESTS & ASSIGNMENTS SYSTEM
-- ============================================================================
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


-- ============================================================================
-- WHITEBOARD SYSTEM
-- ============================================================================

-- Whiteboard Actions Table
CREATE TABLE IF NOT EXISTS public.whiteboard_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  tool TEXT NOT NULL CHECK (tool IN ('pen', 'eraser', 'rectangle', 'circle', 'line', 'text', 'pan')),
  color TEXT NOT NULL,
  line_width INTEGER NOT NULL,
  points JSONB NOT NULL,
  text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_whiteboard_room_id ON public.whiteboard_actions(room_id);
CREATE INDEX IF NOT EXISTS idx_whiteboard_created_at ON public.whiteboard_actions(created_at);
CREATE INDEX IF NOT EXISTS idx_whiteboard_user_id ON public.whiteboard_actions(user_id);

ALTER TABLE public.whiteboard_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view whiteboard actions in their room"
  ON public.whiteboard_actions FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own whiteboard actions"
  ON public.whiteboard_actions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own whiteboard actions"
  ON public.whiteboard_actions FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any whiteboard action"
  ON public.whiteboard_actions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- ============================================================================
-- STORAGE BUCKETS FOR FILE UPLOADS
-- ============================================================================

-- Create storage bucket for note attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'note-attachments',
  'note-attachments',
  false,
  10485760, -- 10MB limit
  NULL -- Allow all file types
)
ON CONFLICT (id) DO NOTHING;

-- Create storage bucket for task attachments
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'task-attachments',
  'task-attachments',
  false,
  10485760, -- 10MB limit
  NULL -- Allow all file types
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for note-attachments
CREATE POLICY "Authenticated users can read note files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'note-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Users can upload note files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'note-attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own note files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'note-attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- Storage policies for task-attachments
CREATE POLICY "Authenticated users can read task files"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'task-attachments' AND auth.role() = 'authenticated');

CREATE POLICY "Users can upload task files"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'task-attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own task files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'task-attachments' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================================
-- ADDITIONAL INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_note_attachments_note_id ON public.note_attachments(note_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON public.task_attachments(task_id);

-- ============================================================================
-- COMPLETE!
-- ============================================================================
-- Your StudySpace V2 database is now fully configured.
-- Next steps:
-- 1. Create your first user account via the application
-- 2. Make yourself admin using: UPDATE public.profiles SET is_admin = true WHERE id = 'your-user-id';
-- 3. Start using all the features!
-- ============================================================================
