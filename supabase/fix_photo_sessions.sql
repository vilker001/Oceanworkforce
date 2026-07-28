-- =====================================================
-- FIX: Add photographer_name column to photo_sessions
-- =====================================================
ALTER TABLE public.photo_sessions 
ADD COLUMN IF NOT EXISTS photographer_name TEXT;

-- Update existing records to fill photographer_name from users table
UPDATE public.photo_sessions ps
SET photographer_name = u.name
FROM public.users u
WHERE ps.photographer_id = u.id
  AND ps.photographer_name IS NULL;
