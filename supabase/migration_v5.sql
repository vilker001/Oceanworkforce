-- =====================================================
-- OCEAN WORKFORCE - MIGRATION V5 (FIX AUTH)
-- =====================================================
-- Execute isto no SQL Editor do Supabase para corrigir o erro de Login
-- =====================================================

-- 1. Corrigir TODOS os campos exigidos pela nova versão do Supabase Auth
UPDATE auth.users 
SET 
  confirmation_token = COALESCE(confirmation_token, ''),
  recovery_token = COALESCE(recovery_token, ''),
  email_change_token_new = COALESCE(email_change_token_new, ''),
  email_change_token_current = COALESCE(email_change_token_current, ''),
  is_sso_user = COALESCE(is_sso_user, false),
  is_super_admin = COALESCE(is_super_admin, false);

-- 2. Atualizar a função de criação de utilizadores para preencher estes campos automaticamente
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
  -- Verificar se quem executa é Gestor de Projetos
  IF NOT EXISTS (
    SELECT 1 FROM public.users 
    WHERE id = auth.uid() AND role = 'Gestor de Projetos'
  ) THEN
    RAISE EXCEPTION 'Apenas o Gestor de Projetos pode criar utilizadores.';
  END IF;

  -- Criar ID
  new_user_id := gen_random_uuid();
  
  -- Encriptar password (compatível com auth.users do Supabase)
  encrypted_pw := crypt(p_password, gen_salt('bf'));

  -- Inserir no Supabase Auth com todos os valores default requeridos pelo GoTrue
  INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    recovery_token,
    email_change_token_new,
    email_change_token_current,
    phone,
    is_sso_user,
    is_super_admin
  ) VALUES (
    '00000000-0000-0000-0000-000000000000',
    new_user_id,
    'authenticated',
    'authenticated',
    p_email,
    encrypted_pw,
    now(),
    '{"provider":"email","providers":["email"]}',
    jsonb_build_object('name', p_name, 'role', p_role),
    now(),
    now(),
    '',
    '',
    '',
    '',
    NULL,
    false,
    false
  );

  -- Inserir no perfil público
  INSERT INTO public.users (id, email, name, role, avatar, must_change_password)
  VALUES (new_user_id, p_email, p_name, p_role, p_avatar, true);

  -- Adicionar KPIs padrão para o novo cargo
  IF p_role = 'Fotógrafo' THEN
    INSERT INTO public.user_kpis (user_id, kpi_name, target_score, actual_score) VALUES
      (new_user_id, 'Sessões executadas', 100, 0),
      (new_user_id, 'Taxa de execução (%)', 100, 0),
      (new_user_id, 'Receita individual gerada (MT)', 100, 0);
  ELSIF p_role = 'Promoter de Venda' THEN
    INSERT INTO public.user_kpis (user_id, kpi_name, target_score, actual_score) VALUES
      (new_user_id, 'Leads Contactados', 100, 0),
      (new_user_id, 'Leads Qualificados', 100, 0),
      (new_user_id, 'Taxa de Qualificação (%)', 100, 0),
      (new_user_id, 'Reuniões Agendadas', 100, 0);
  ELSIF p_role = 'Colaborador' THEN
    INSERT INTO public.user_kpis (user_id, kpi_name, target_score, actual_score) VALUES
      (new_user_id, 'Eficiência de Tarefas', 100, 0);
  END IF;

  RETURN new_user_id;
END;
$$;
