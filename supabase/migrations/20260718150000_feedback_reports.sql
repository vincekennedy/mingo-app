-- feedback_reports: unauthenticated issue / feedback submissions from the app
CREATE TABLE IF NOT EXISTS public.feedback_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category TEXT NOT NULL,
  email TEXT NOT NULL,
  subject TEXT NOT NULL,
  details TEXT NOT NULL,
  user_id UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  screen TEXT NULL,
  app_version TEXT NOT NULL,
  game_code TEXT NULL,
  user_agent TEXT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT feedback_reports_category_check CHECK (
    category IN ('bug', 'feature', 'enhancement', 'account', 'other')
  ),
  CONSTRAINT feedback_reports_email_check CHECK (char_length(trim(email)) > 0),
  CONSTRAINT feedback_reports_subject_check CHECK (char_length(trim(subject)) > 0),
  CONSTRAINT feedback_reports_details_check CHECK (char_length(trim(details)) > 0),
  CONSTRAINT feedback_reports_app_version_check CHECK (char_length(trim(app_version)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_feedback_reports_created_at
  ON public.feedback_reports(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_feedback_reports_category
  ON public.feedback_reports(category);

ALTER TABLE public.feedback_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can submit feedback" ON public.feedback_reports;

-- Guests (anon) and signed-in users may insert only; no client reads
CREATE POLICY "Anyone can submit feedback" ON public.feedback_reports
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    category IN ('bug', 'feature', 'enhancement', 'account', 'other')
    AND char_length(trim(email)) > 0
    AND char_length(trim(subject)) > 0
    AND char_length(trim(details)) > 0
    AND char_length(trim(app_version)) > 0
    AND (user_id IS NULL OR user_id = auth.uid())
  );
