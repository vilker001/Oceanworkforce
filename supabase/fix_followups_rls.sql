-- =====================================================
-- FIX: Update follow_ups RLS to allow the client responsible to see history
-- =====================================================

DROP POLICY IF EXISTS "Allow visible follow_ups to authorized users" ON public.follow_ups;

CREATE POLICY "Allow visible follow_ups to authorized users" 
  ON public.follow_ups FOR SELECT TO authenticated USING (
    auth.uid() = created_by OR
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE id = auth.uid() 
      AND role IN ('Gestor de Projetos', 'Gestor Técnico', 'Gestor de Trading')
    ) OR
    EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = client_id AND c.responsible_id = auth.uid()
    )
  );
