-- =====================================================
-- FIX: Allow system to insert transactions from photo sessions
-- O problema: A política RLS bloqueia a inserção de transações
-- quando o utilizador não é o Gestor de Projetos.
-- Isso impede que os 50% dos lucros das sessões entrem no caixa.
-- =====================================================

-- Remover a política restritiva atual
DROP POLICY IF EXISTS "Only GP can manage transactions" ON public.transactions;

-- Política 1: Qualquer utilizador autenticado pode INSERIR transações
-- (necessário para o sistema registar receitas de sessões automaticamente)
CREATE POLICY "Authenticated users can insert transactions"
  ON public.transactions FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Política 2: Apenas o Gestor de Projetos pode VER, EDITAR e APAGAR
CREATE POLICY "GP can read transactions"
  ON public.transactions FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Gestor de Projectos')
  );

CREATE POLICY "GP can update transactions"
  ON public.transactions FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Gestor de Projectos')
  );

CREATE POLICY "GP can delete transactions"
  ON public.transactions FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Gestor de Projectos')
  );
