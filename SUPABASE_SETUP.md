# 🚀 Guia de Configuração do Supabase

## Passo 1: Criar Projeto no Supabase

1. Acesse [https://supabase.com](https://supabase.com) e faça login (ou crie uma conta gratuita)
2. Clique em **"New Project"**
3. Preencha:
   - **Name:** Ocean Group Management
   - **Database Password:** Escolha uma senha forte (guarde-a!)
   - **Region:** Europe West (Frankfurt) - mais próximo de Moçambique
   - **Pricing Plan:** Free (suficiente para começar)
4. Clique em **"Create new project"** e aguarde ~2 minutos

## Passo 2: Executar o Schema SQL

1. No painel do Supabase, vá em **SQL Editor** (ícone de banco de dados na barra lateral)
2. Clique em **"New query"**
3. Abra o arquivo `supabase/schema.sql` deste projeto
4. **Copie TODO o conteúdo** do arquivo
5. **Cole** no editor SQL do Supabase
6. Clique em **"Run"** (ou pressione Ctrl+Enter)
7. Aguarde a mensagem de sucesso ✅

## Passo 3: Copiar Credenciais

1. No Supabase, vá em **Settings** (ícone de engrenagem) → **API**
2. Você verá duas informações importantes:

### Project URL
```
https://seu-projeto-id.supabase.co
```

### API Keys
- **anon/public key** - Esta é a chave que você vai usar no frontend

3. Copie esses valores

## Passo 4: Configurar Variáveis de Ambiente

1. Abra o arquivo `.env.local` na raiz do projeto
2. Substitua os valores:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://seu-projeto-id.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

3. Salve o arquivo

## Passo 5: Testar a Conexão

1. Pare o servidor de desenvolvimento (Ctrl+C no terminal)
2. Inicie novamente:
```bash
npm run dev
```

3. Acesse `http://localhost:3002`
4. Se não houver erros no console, a conexão está funcionando! 🎉

## Passo 6: Criar Primeiro Usuário

### Opção A: Via Supabase Dashboard (Recomendado para teste)

1. No Supabase, vá em **Authentication** → **Users**
2. Clique em **"Add user"** → **"Create new user"**
3. Preencha:
   - **Email:** seu-email@exemplo.com
   - **Password:** SuaSenhaSegura123!
   - **Auto Confirm User:** ✅ Marque esta opção
4. Clique em **"Create user"**
5. Copie o **User UID** que aparece

### Inserir Dados do Usuário na Tabela `users`

1. Vá em **SQL Editor** e execute:

```sql
INSERT INTO users (id, email, name, role, avatar)
VALUES (
  'cole-o-user-uid-aqui',
  'seu-email@exemplo.com',
  'Seu Nome',
  'Gestor de Projectos',
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCxzN6it180mYjo0nbuagH8FhZ6Eq_ybfPGL2TyBbqrntvbwJL9mhXaatHPfbRfG7gI4d5RRz2Dd4VCyJBJov4RwCLrFwVoawFsspmC0WTMyivVK78Z5vQzBpUDlzuwGGe689Y3KVg1pILwvcpOmkuPtPjRQl_jYr2cSbCOPNbcTLoObL2JTzUSvDysBvnB0DkQWJnpxk7WEI4lBBgszw3rRTaHOSoqcOIlF9xHGM9YHcIvCe-grLP3bA452ltgtGXAexoh5hV7Jd0'
);
```

2. Agora você pode fazer login no app com esse email e senha!

### Opção B: Via Aplicação (Após implementar Auth)

Quando implementarmos a autenticação completa, você poderá criar usuários diretamente pelo wizard de onboarding.

## Próximos Passos

Agora que o Supabase está configurado, vou implementar:

1. ✅ Autenticação real (substituir login mockado)
2. ✅ Queries para buscar/criar/atualizar dados
3. ✅ Sincronização em tempo real
4. ✅ Migração completa do estado local para Supabase

## Troubleshooting

### Erro: "Missing Supabase environment variables"
- Verifique se o arquivo `.env.local` existe e está na raiz do projeto
- Confirme que as variáveis começam com `VITE_`
- Reinicie o servidor de desenvolvimento

### Erro: "Invalid API key"
- Verifique se copiou a chave **anon/public** (não a service_role)
- Certifique-se de que não há espaços extras na chave

### Erro ao executar SQL
- Verifique se copiou TODO o conteúdo do `schema.sql`
- Tente executar em partes (uma tabela por vez)

### Erro de RLS (Row Level Security)
- Certifique-se de que está logado no app
- Verifique se o usuário existe na tabela `users`
- Confirme que o `user.id` na tabela `users` corresponde ao UID do Auth

## Suporte

Se encontrar problemas, me avise! Posso ajudar a debugar ou ajustar as configurações.
