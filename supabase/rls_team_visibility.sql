-- =====================================================
-- OCEAN GROUP - RLS: VISIBILIDADE DA EQUIPE
-- =====================================================
-- Execute este script no Supabase SQL Editor:
-- https://app.supabase.com/project/_/sql
-- =====================================================

-- PASSO 1: Criar função auxiliar que verifica se o utilizador
-- atual é um Gestor. Usa SECURITY DEFINER para contornar o RLS
-- e evitar recursão infinita.
-- =====================================================
CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = auth.uid()
      AND role IN (
        'Gestor de Projectos',
        'Gestor Criativo',
        'Gestor Financeiro',
        'Gestor de Parceiros e Clientes',
        'Gestor de Trading e Negociação'
      )
  );
END;
$$;

-- Revogar acesso público à função (segurança)
REVOKE ALL ON FUNCTION public.is_manager() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_manager() TO authenticated;


-- =====================================================
-- PASSO 2: Remover políticas de SELECT antigas na tabela users
-- e substituir pela nova política granular
-- =====================================================

-- Remover política antiga que dava acesso total a todos
DROP POLICY IF EXISTS "Users can read all users" ON public.users;

-- Remover políticas antigas que possam existir com outros nomes
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
DROP POLICY IF EXISTS "Managers can view all users" ON public.users;
DROP POLICY IF EXISTS "Users can view own or managers view all" ON public.users;


-- =====================================================
-- PASSO 3: Criar a nova política de SELECT
-- Regra: cada utilizador vê o SEU PRÓPRIO perfil
--        Gestores veem TODOS os perfis
-- =====================================================
CREATE POLICY "Visibilidade de utilizadores"
ON public.users
FOR SELECT
TO authenticated
USING (
  -- Cada utilizador vê sempre o seu próprio perfil
  auth.uid() = id
  OR
  -- Gestores veem todos os utilizadores
  public.is_manager()
);


-- =====================================================
-- RESULTADO ESPERADO:
-- - Colaborador/Designer/Promoter/Videomaker → vê só o seu perfil
-- - Gestor de Projectos/Criativo/Financeiro/
--   Parceiros e Clientes/Trading → vê todos
-- =====================================================
