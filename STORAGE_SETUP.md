# 📸 Configuração do Supabase Storage para Upload de Fotos

## Passo 1: Criar Bucket no Supabase

1. Acesse seu projeto no Supabase: https://app.supabase.com
2. Vá em **Storage** (ícone de pasta na barra lateral)
3. Clique em **"Create a new bucket"**
4. Configure o bucket:
   - **Name:** `user-uploads`
   - **Public bucket:** ✅ Marque esta opção (para permitir acesso público às fotos)
   - **File size limit:** 2 MB
   - **Allowed MIME types:** `image/*`
5. Clique em **"Create bucket"**

## Passo 2: Configurar Políticas de Acesso (RLS)

Após criar o bucket, configure as políticas:

### Política 1: Permitir Upload (Authenticated Users)

```sql
-- Ir em Storage → user-uploads → Policies → New Policy
-- Nome: "Authenticated users can upload"
-- Operation: INSERT
-- Policy definition:
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'user-uploads');
```

### Política 2: Permitir Leitura Pública

```sql
-- Nome: "Public read access"
-- Operation: SELECT
-- Policy definition:
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'user-uploads');
```

### Política 3: Permitir Atualização (Own Files)

```sql
-- Nome: "Users can update own files"
-- Operation: UPDATE
-- Policy definition:
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'user-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### Política 4: Permitir Exclusão (Own Files)

```sql
-- Nome: "Users can delete own files"
-- Operation: DELETE
-- Policy definition:
CREATE POLICY "Users can delete own files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'user-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);
```

## Passo 3: Testar Upload

1. Faça login no app
2. Clique na sua foto no sidebar
3. Clique em "Fazer Upload de Foto"
4. Selecione uma imagem (JPG, PNG ou GIF, máx. 2MB)
5. A foto será carregada automaticamente

## Estrutura de Pastas

As fotos serão organizadas assim no bucket:
```
user-uploads/
  └── avatars/
      ├── user-id-1-timestamp.jpg
      ├── user-id-2-timestamp.png
      └── ...
```

## Troubleshooting

### Erro: "new row violates row-level security policy"
- Verifique se as políticas RLS foram criadas corretamente
- Confirme que o usuário está autenticado

### Erro: "Bucket not found"
- Verifique se o nome do bucket é exatamente `user-uploads`
- Confirme que o bucket foi criado como público

### Foto não aparece após upload
- Verifique se a política de leitura pública está ativa
- Confirme que o bucket é público
- Limpe o cache do navegador (Ctrl+Shift+R)

## Limitações do Plano Free

- **Storage:** 1 GB
- **Bandwidth:** 2 GB/mês
- **Uploads:** Ilimitados

Para equipes maiores, considere upgrade para plano Pro ($25/mês):
- **Storage:** 100 GB
- **Bandwidth:** 200 GB/mês

## Segurança

✅ **Implementado:**
- Validação de tipo de arquivo (apenas imagens)
- Limite de tamanho (2MB)
- RLS para proteger uploads
- Nomes de arquivo únicos (evita sobrescrita)

✅ **Recomendações:**
- Implementar scan de vírus (plano Enterprise)
- Adicionar watermark para fotos de perfil
- Implementar rate limiting (evitar spam de uploads)
