-- =====================================================
-- FIX: Update follow_ups and clients next_follow_up_date to TIMESTAMPTZ
-- =====================================================

-- 1. Apagar temporariamente a view que depende da coluna
DROP VIEW IF EXISTS public.clients_with_users;

-- 2. Atualizar os tipos de coluna para incluir horas e fuso horário
ALTER TABLE public.clients 
ALTER COLUMN next_follow_up_date TYPE TIMESTAMP WITH TIME ZONE 
USING next_follow_up_date::TIMESTAMP WITH TIME ZONE;

ALTER TABLE public.follow_ups 
ALTER COLUMN next_follow_up_date TYPE TIMESTAMP WITH TIME ZONE 
USING next_follow_up_date::TIMESTAMP WITH TIME ZONE;

-- 3. Recriar a view com a estrutura exata que estava antes
CREATE OR REPLACE VIEW public.clients_with_users AS
SELECT 
  c.*,
  u.name as responsible_name,
  u.avatar as responsible_avatar
FROM public.clients c
LEFT JOIN public.users u ON c.responsible_id = u.id;
