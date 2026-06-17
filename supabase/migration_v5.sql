-- =====================================================
-- OCEAN WORKFORCE - MIGRATION V5 (FIX AUTH)
-- =====================================================
-- Execute isto no SQL Editor do Supabase para corrigir o erro de Login
-- =====================================================

-- 1. Corrigir TODOS os campos exigidos pela nova versão do Supabase Auth (sem mexer no phone!)
UPDATE auth.users 
SET 
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  email_change = COALESCE(email_change, ''),
  is_sso_user = COALESCE(is_sso_user, false),
  is_super_admin = COALESCE(is_super_admin, false);

-- 2. Atualizar a função
CREATE OR REPLACE FUNCTION public.create_new_user(
  p_email TEXT,
  p_password TEXT,
  p_name TEXT,
  p_role TEXT,
  p_avatar TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_user_id UUID;
  encrypted_pw TEXT;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'Gestor de Projetos') THEN
    RAISE EXCEPTION 'Apenas o Gestor de Projetos pode criar utilizadores.';
  END IF;

  new_user_id := gen_random_uuid();
  encrypted_pw := crypt(p_password, gen_salt('bf'));

  INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change_token_current,
    email_change, is_sso_user, is_super_admin
  ) VALUES (
    '00000000-0000-0000-0000-000000000000', new_user_id, 'authenticated', 'authenticated', p_email, encrypted_pw, now(),
    '{"provider":"email","providers":["email"]}', jsonb_build_object('name', p_name, 'role', p_role), now(), now(),
    '', '', '', '', '', false, false
  );

  INSERT INTO public.users (id, email, name, role, avatar, must_change_password)
  VALUES (new_user_id, p_email, p_name, p_role, p_avatar, true);

  -- Adicionar KPIs (simplificado aqui para visualização)
  IF p_role = 'Colaborador' THEN
    INSERT INTO public.user_kpis (user_id, kpi_name, target_score, actual_score) VALUES (new_user_id, 'Eficiência de Tarefas', 100, 0);
  END IF;

  RETURN new_user_id;
END;
$$;
