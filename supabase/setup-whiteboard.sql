-- Create whiteboard_actions table for storing drawing actions
CREATE TABLE IF NOT EXISTS whiteboard_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  tool TEXT NOT NULL CHECK (tool IN ('pen', 'eraser', 'rectangle', 'circle', 'line', 'text', 'pan')),
  color TEXT NOT NULL,
  line_width INTEGER NOT NULL,
  points JSONB NOT NULL,
  text TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_whiteboard_room_id ON whiteboard_actions(room_id);
CREATE INDEX IF NOT EXISTS idx_whiteboard_created_at ON whiteboard_actions(created_at);
CREATE INDEX IF NOT EXISTS idx_whiteboard_user_id ON whiteboard_actions(user_id);

-- Enable Row Level Security
ALTER TABLE whiteboard_actions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view whiteboard actions in their room"
  ON whiteboard_actions FOR SELECT
  USING (true);

CREATE POLICY "Users can insert their own whiteboard actions"
  ON whiteboard_actions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own whiteboard actions"
  ON whiteboard_actions FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can delete any whiteboard action"
  ON whiteboard_actions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.is_admin = true
    )
  );

-- Grant permissions
GRANT ALL ON whiteboard_actions TO authenticated;
GRANT SELECT ON whiteboard_actions TO anon;

-- Add whiteboard_locked column to settings table
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS whiteboard_locked BOOLEAN DEFAULT false NOT NULL;
