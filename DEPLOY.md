# 🚀 Guia Rápido de Deploy - Ocean Group Management Suite

## Pré-requisitos Completos ✅
- [x] Projeto Supabase criado
- [x] Schema SQL executado
- [x] Primeiro usuário criado
- [x] Variáveis de ambiente configuradas (`.env.local`)
- [x] Autenticação real implementada

## Deploy para Produção (Vercel - Recomendado)

### Passo 1: Preparar Repositório Git

```bash
# Inicializar git (se ainda não fez)
git init

# Adicionar .gitignore
echo "node_modules
.env.local
dist
.DS_Store" > .gitignore

# Commit inicial
git add .
git commit -m "Initial commit - Ocean Group Management Suite"

# Criar repositório no GitHub e fazer push
git remote add origin https://github.com/seu-usuario/ocean-group-management.git
git branch -M main
git push -u origin main
```

### Passo 2: Deploy no Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login
2. Clique em **"Add New Project"**
3. Importe seu repositório do GitHub
4. Configure as variáveis de ambiente:
   - `VITE_SUPABASE_URL` = sua URL do Supabase
   - `VITE_SUPABASE_ANON_KEY` = sua chave pública

5. Clique em **"Deploy"**
6. Aguarde ~2 minutos

### Passo 3: Configurar Domínio (Opcional)

1. No Vercel, vá em **Settings → Domains**
2. Adicione seu domínio personalizado (ex: `app.oceangroup.co.mz`)
3. Configure os DNS conforme instruções do Vercel

### Passo 4: Configurar Autenticação OAuth (Google)

1. No Supabase, vá em **Authentication → Providers**
2. Habilite **Google**
3. Adicione a URL de callback do Vercel:
   ```
   https://seu-app.vercel.app/**
   ```
4. Configure Client ID e Secret do Google Cloud Console

## Deploy Alternativo (Netlify)

```bash
# Instalar Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod
```

## Comandos Úteis

### Build Local (Teste antes de deploy)
```bash
npm run build
npm run preview
```

### Verificar Erros
```bash
npm run build 2>&1 | tee build.log
```

## Configurações Pós-Deploy

### 1. Adicionar Usuários da Equipe

**Opção A: Via Supabase Dashboard**
1. Authentication → Users → Add user
2. Criar usuário com email e senha
3. Copiar User UID
4. Executar SQL:
```sql
INSERT INTO users (id, email, name, role, avatar)
VALUES ('user-uid-aqui', 'email@oceangroup.com', 'Nome', 'Colaborador', 'url-avatar');
```

**Opção B: Via Aplicação (Recomendado)**
1. Usuário acessa a URL do app
2. Faz login com Google ou cria conta
3. Completa onboarding
4. Gestor de Projectos pode ajustar role se necessário

### 2. Migrar Dados de Teste (Se necessário)

Se você tem dados de teste que quer manter:

```sql
-- Exemplo: Inserir tarefas
INSERT INTO tasks (title, project, status, priority, responsible_id, start_date, due_date)
VALUES 
  ('Implementar Dashboard', 'Ocean Suite', 'InProgress', 'ALTA', 'user-id-aqui', '2024-01-20', '2024-01-25');

-- Exemplo: Inserir clientes
INSERT INTO clients (name, email, status, responsible_id)
VALUES 
  ('Empresa XYZ', 'contato@xyz.com', 'Novo Lead', 'user-id-aqui');
```

### 3. Configurar Backup Automático

No Supabase:
1. Settings → Database → Backups
2. Habilitar backups diários (plano Pro)

## Monitoramento

### Logs de Erro
- Vercel: Dashboard → Logs
- Supabase: Logs → Database / Auth

### Analytics (Opcional)
```bash
# Adicionar Vercel Analytics
npm install @vercel/analytics
```

Em `index.tsx`:
```typescript
import { Analytics } from '@vercel/analytics/react';

// Adicionar no final do JSX
<Analytics />
```

## Troubleshooting

### Erro: "Missing environment variables"
- Verifique se adicionou todas as variáveis no Vercel
- Rebuild o projeto após adicionar variáveis

### Erro: "Failed to fetch"
- Verifique se a URL do Supabase está correta
- Confirme que RLS está configurado corretamente

### Usuários não conseguem fazer login
- Verifique se o email está confirmado no Supabase Auth
- Confirme que o usuário existe na tabela `users`

## Custos Estimados

| Serviço | Plano | Custo/mês |
|---------|-------|-----------|
| Supabase | Free | $0 |
| Vercel | Hobby | $0 |
| **Total** | | **$0** |

Para escalar:
- Supabase Pro: $25/mês (8GB DB)
- Vercel Pro: $20/mês (analytics + domínio)

## Próximos Passos

1. ✅ Testar login em produção
2. ✅ Adicionar todos os membros da equipe
3. ✅ Configurar backup
4. ⏳ Treinar equipe (30min)
5. ⏳ Monitorar uso nos primeiros dias

---

**🎉 Parabéns! Seu sistema está em produção!**

Acesse: `https://seu-app.vercel.app`
