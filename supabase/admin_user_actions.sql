-- =====================================================
-- ADMIN USER ACTIONS RPCs
-- Executar este script no editor SQL do Supabase.
-- =====================================================

-- 1. APAGAR UTILIZADOR
CREATE OR REPLACE FUNCTION public.delete_user_admin(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se é um gestor
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role ILIKE '%Gestor%'
  ) THEN
    RAISE EXCEPTION 'Apenas gestores podem apagar utilizadores.';
  END IF;

  -- 1. Desvincular as tarefas deste utilizador (Tarefas por Alocar)
  UPDATE public.tasks 
  SET responsible_id = NULL
  WHERE responsible_id = p_user_id;

  -- 2. Desvincular os clientes (Opcional, mas seguro)
  UPDATE public.clients
  SET responsible_id = NULL, responsible = ''
  WHERE responsible_id = p_user_id;

  -- 3. Apagar o utilizador público
  DELETE FROM public.users WHERE id = p_user_id;

  -- 4. Apagar da Auth (o que faz logout e impede novos logins)
  DELETE FROM auth.users WHERE id = p_user_id;

END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_admin(UUID) TO authenticated;

-- 2. BLOQUEAR / DESBLOQUEAR UTILIZADOR
CREATE OR REPLACE FUNCTION public.toggle_block_user(p_user_id UUID, p_block BOOLEAN)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se é um gestor
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role ILIKE '%Gestor%'
  ) THEN
    RAISE EXCEPTION 'Apenas gestores podem bloquear utilizadores.';
  END IF;

  IF p_block THEN
    -- Banir até 2099
    UPDATE auth.users SET banned_until = '2099-01-01'::timestamp WHERE id = p_user_id;
  ELSE
    -- Remover banimento
    UPDATE auth.users SET banned_until = NULL WHERE id = p_user_id;
  END IF;

END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_block_user(UUID, BOOLEAN) TO authenticated;
