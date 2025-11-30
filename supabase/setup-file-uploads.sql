-- FILE UPLOADS SETUP FOR NOTES AND TASKS

-- 0. DROP EXISTING TABLES AND POLICIES IF THEY EXIST
DROP TABLE IF EXISTS public.note_attachments CASCADE;
DROP TABLE IF EXISTS public.task_attachments CASCADE;

-- 1. CREATE NOTE ATTACHMENTS TABLE
CREATE TABLE IF NOT EXISTS public.note_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.note_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments for notes they can see"
  ON public.note_attachments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.notes
      WHERE id = note_id
        AND (is_public = true OR auth.uid() = user_id)
    )
  );

CREATE POLICY "Users can add attachments to own notes"
  ON public.note_attachments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.notes
      WHERE id = note_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own note attachments"
  ON public.note_attachments FOR DELETE
  USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.notes
      WHERE id = note_id AND user_id = auth.uid()
    )
  );

-- 2. CREATE TASK ATTACHMENTS TABLE
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID REFERENCES public.tasks(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view attachments for own tasks"
  ON public.task_attachments FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add attachments to own tasks"
  ON public.task_attachments FOR INSERT
  WITH CHECK (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE id = task_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own task attachments"
  ON public.task_attachments FOR DELETE
  USING (
    auth.uid() = user_id AND
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE id = task_id AND user_id = auth.uid()
    )
  );

-- 3. CREATE TRIGGERS FOR UPDATED_AT ON ATTACHMENTS (OPTIONAL)
CREATE TRIGGER handle_note_attachments_updated_at
  BEFORE UPDATE ON public.note_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER handle_task_attachments_updated_at
  BEFORE UPDATE ON public.task_attachments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 4. CREATE INDEXES FOR BETTER PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_note_attachments_note_id ON public.note_attachments(note_id);
CREATE INDEX IF NOT EXISTS idx_note_attachments_user_id ON public.note_attachments(user_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_task_id ON public.task_attachments(task_id);
CREATE INDEX IF NOT EXISTS idx_task_attachments_user_id ON public.task_attachments(user_id);

-- 5. CREATE STORAGE BUCKET POLICIES FOR NOTE-ATTACHMENTS
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

-- 6. CREATE STORAGE BUCKET POLICIES FOR TASK-ATTACHMENTS
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
