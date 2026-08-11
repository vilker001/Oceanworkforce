-- Migration v9: Daily Reports

CREATE TABLE public.daily_reports (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    date date NOT NULL,
    description text NOT NULL,
    hours_dedicated numeric NOT NULL,
    expected_output text NOT NULL,
    manager_feedback text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reports"
    ON public.daily_reports FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own reports"
    ON public.daily_reports FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reports"
    ON public.daily_reports FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reports"
    ON public.daily_reports FOR DELETE
    USING (auth.uid() = user_id);

-- Managers can see all reports
CREATE POLICY "Managers can view all reports"
    ON public.daily_reports FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('Gestor de Projetos', 'Gestor Técnico', 'Gestor de Trading')
        )
    );

CREATE POLICY "Managers can update all reports (for feedback)"
    ON public.daily_reports FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid()
            AND users.role IN ('Gestor de Projetos', 'Gestor Técnico', 'Gestor de Trading')
        )
    );
