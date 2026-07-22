-- ============================================================
-- Migration v9: Corrigir RLS de facturas + Storage bucket
-- ============================================================

-- 1. Corrigir a policy de UPDATE nas invoices
--    (o role correto é 'Gestor de Projetos' sem 'c', não 'Gestor de Projectos')
DROP POLICY IF EXISTS "Managers can update invoices" ON invoices;

CREATE POLICY "Authenticated users can update invoices"
  ON invoices FOR UPDATE
  USING (auth.role() = 'authenticated');

-- 2. Garantir que invoice_items também tem policy de update
DROP POLICY IF EXISTS "Authenticated users can update invoice items" ON invoice_items;

CREATE POLICY "Authenticated users can update invoice items"
  ON invoice_items FOR UPDATE
  USING (auth.role() = 'authenticated');

-- 3. Garantir que a sequência de facturas existe e tem permissões
ALTER TABLE IF EXISTS invoice_sequence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read sequence" ON invoice_sequence;
DROP POLICY IF EXISTS "Authenticated can update sequence" ON invoice_sequence;

CREATE POLICY "Authenticated can read sequence"
  ON invoice_sequence FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can update sequence"
  ON invoice_sequence FOR ALL
  USING (auth.role() = 'authenticated');

-- 4. Recriar a função gerar_codigo_factura para ter permissões correctas
CREATE OR REPLACE FUNCTION gerar_codigo_factura()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ano INT;
  v_ultimo_numero INT;
  v_codigo TEXT;
BEGIN
  v_ano := extract(year from current_date);
  
  INSERT INTO invoice_sequence (ano, ultimo_numero)
  VALUES (v_ano, 1)
  ON CONFLICT (ano) DO UPDATE
  SET ultimo_numero = invoice_sequence.ultimo_numero + 1
  RETURNING ultimo_numero INTO v_ultimo_numero;

  v_codigo := 'FT' || v_ano || '/' || LPAD(v_ultimo_numero::TEXT, 4, '0');
  
  RETURN v_codigo;
END;
$$;

-- Garantir que o role authenticated pode executar a função
GRANT EXECUTE ON FUNCTION gerar_codigo_factura() TO authenticated;

-- 5. Criar o bucket 'facturas' no Storage (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('facturas', 'facturas', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage policies para o bucket facturas
DROP POLICY IF EXISTS "Authenticated can upload facturas" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated can upsert facturas" ON storage.objects;
DROP POLICY IF EXISTS "Public can read facturas" ON storage.objects;

CREATE POLICY "Authenticated can upload facturas"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'facturas');

CREATE POLICY "Authenticated can upsert facturas"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'facturas');

CREATE POLICY "Public can read facturas"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'facturas');
