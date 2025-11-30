-- Add whiteboard_locked column to settings table
ALTER TABLE public.settings 
ADD COLUMN IF NOT EXISTS whiteboard_locked BOOLEAN DEFAULT false NOT NULL;
