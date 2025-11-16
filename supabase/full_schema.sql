-- PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
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
