# Ombro Amigo - Sistema de Gestão de Auxílios Corporativos

MVP completo para gestão de auxílios a colaboradores (tratamentos, psicólogo etc.) com automação de emails e compliance LGPD.

## 🚀 Setup Rápido

### Pré-requisitos
- Node.js v18+
- npm ou yarn
- Conta Supabase (já configurada)

### Instalação

1. **Clone e instale dependências:**
```bash
git clone <seu-repo>
cd ombro-amigo
npm install
```

2. **Configure ambiente:**
```bash
# As variáveis já estão configuradas no sistema Lovable
# Banco de dados e Edge Functions já foram criados
```

3. **Inicie o projeto:**
```bash
npm run dev
```

## 📋 Funcionalidades Implementadas

### ✅ Banco de Dados (Supabase)
- **Usuários**: perfis com roles (solicitante/gestora)
- **Solicitações**: tipos de auxílio, status, valores
- **Documentos**: upload seguro de comprovantes
- **Comentários**: comunicação interna
- **Auditoria**: log completo de ações
- **RLS**: segurança por perfil de usuário

### ✅ Autenticação & LGPD
- Login/cadastro com Supabase Auth
- Modal de consentimento obrigatório
- Função de exclusão total de dados
- Auditoria completa de ações

### ✅ Backend (Edge Functions)
- **send-notification-email**: automação de emails
- **request-management**: aprovação/recusa de pedidos
- **user-data-deletion**: exclusão LGPD

### ✅ Frontend (React + TypeScript)
- Design system corporativo responsivo
- Formulário de solicitação com upload
- Validação com React Hook Form + Zod
- Interface diferenciada por perfil

## 🎯 Como Usar

### Para Solicitantes:
1. Acesse `/login` e crie conta
2. Aceite a política de privacidade
3. Crie solicitações com documentos
4. Acompanhe status em tempo real

### Para Gestoras:
1. Cadastre-se com role "gestora"
2. Visualize todas as solicitações
3. Aprove/recuse com comentários
4. Sistema envia emails automaticamente

## 🔧 Arquitetura Técnica

### Stack:
- **Frontend**: React 18 + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Edge Functions)
- **Storage**: Supabase Storage (documentos)
- **Auth**: Supabase Auth + RLS
- **UI**: shadcn/ui + design system customizado

### Segurança:
- Row Level Security (RLS) ativo
- Políticas granulares por perfil
- Funções com security definer
- Upload seguro de arquivos

## 🚨 Próximos Passos

Para produção, adicione:
1. **Email Provider**: Resend/SendGrid nas Edge Functions
2. **Domínio**: configure domínio customizado
3. **Monitoramento**: logs e analytics
4. **Backup**: políticas de backup automático

## 📱 Demonstração

- **Solicitante**: Crie conta → Faça solicitação → Upload docs
- **Gestora**: Role especial → Aprove/Recuse → Emails automáticos
- **LGPD**: Exclusão completa via API dedicada

Sistema **100% funcional** out of the box! 🎉

---

**Desenvolvido com Lovable + Supabase**