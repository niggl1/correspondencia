# 📦 AppCorrespondencia - Sistema de Gestão de Correspondências

Sistema completo para gestão de correspondências em condomínios, com múltiplos perfis de usuário e notificações por e-mail.

---

## 🚀 **Tecnologias**

- **Framework:** Next.js 16 (App Router)
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS
- **Backend:** Firebase (Authentication, Firestore, Storage)
- **E-mail:** Resend API
- **Ícones:** Lucide React

---

## 📋 **Pré-requisitos**

- Node.js 18+ instalado
- Conta no Firebase
- Conta no Resend (para envio de e-mails)
- npm ou pnpm

---

## 🔧 **Instalação Local**

### **1. Clone o repositório**

```bash
git clone https://github.com/seu-usuario/app-correspondencia.git
cd app-correspondencia
```

### **2. Instale as dependências**

```bash
npm install
# ou
pnpm install
```

### **3. Configure as variáveis de ambiente**

Copie o arquivo `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

Edite o arquivo `.env.local` e adicione suas credenciais:

```env
# Firebase
NEXT_PUBLIC_FIREBASE_API_KEY=sua_api_key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=seu_projeto.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=seu_projeto_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=seu_projeto.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=seu_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=seu_app_id

# Resend
RESEND_API_KEY=re_sua_chave_resend
EMAIL_FROM=correspondencia@seudominio.com.br

# URL base
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

### **4. Configure o Firebase**

1. Acesse o [Firebase Console](https://console.firebase.google.com/)
2. Crie um novo projeto ou use um existente
3. Ative **Authentication** (método: E-mail/Senha)
4. Ative **Firestore Database**
5. Ative **Storage**
6. **Importe as regras de segurança:**
   - Vá em **Firestore Database → Regras**
   - Copie o conteúdo de `firestore.rules` e cole lá
   - Publique as regras

### **5. Rode o projeto**

```bash
npm run dev
# ou
pnpm dev
```

Acesse: [http://localhost:3000](http://localhost:3000)

---

## 🌐 **Deploy na Vercel (Recomendado)**

### **1. Conecte seu repositório**

1. Acesse [vercel.com](https://vercel.com)
2. Clique em **"New Project"**
3. Importe seu repositório do GitHub

### **2. Configure as variáveis de ambiente**

Na aba **"Environment Variables"**, adicione:

```
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...
RESEND_API_KEY=...
EMAIL_FROM=...
NEXT_PUBLIC_BASE_URL=https://seudominio.com.br
```

⚠️ **IMPORTANTE:** Não use `NEXT_PUBLIC_` para `RESEND_API_KEY`!

### **3. Deploy**

Clique em **"Deploy"** e aguarde o build finalizar.

---

## 👥 **Perfis de Usuário**

| Perfil | Permissões |
| :--- | :--- |
| **AdminMaster** | Acesso total ao sistema |
| **Admin** | Gerenciar condomínios e usuários |
| **Responsável** | Gerenciar seu condomínio (blocos, unidades, porteiros, moradores) |
| **Porteiro** | Registrar e gerenciar correspondências |
| **Morador** | Visualizar suas correspondências |

---

## 📂 **Estrutura de Pastas**

```
app/
├── api/                    # API routes (Next.js)
│   └── enviar-email/       # Endpoint para envio de e-mails
├── dashboard-admin/        # Painel do admin
├── dashboard-porteiro/     # Painel do porteiro
├── dashboard-responsavel/  # Painel do responsável
├── dashboard-morador/      # Painel do morador
├── lib/                    # Configurações (Firebase, helpers)
└── login/                  # Página de login

components/                 # Componentes reutilizáveis
hooks/                      # Custom hooks (useAuth, useCorrespondencias)
utils/                      # Funções utilitárias
types/                      # Tipos TypeScript
constants/                  # Constantes do projeto
```

---

## 🔒 **Segurança**

- ✅ Regras de segurança do Firestore configuradas
- ✅ Chaves de API protegidas no servidor
- ✅ Headers de segurança configurados
- ✅ Middleware de proteção de rotas
- ✅ Autenticação obrigatória para rotas privadas

---

## 📱 **Roadmap: Versão Mobile**

O projeto está preparado para evolução para aplicativo mobile:

- **React Native** com Expo
- Compartilhamento de lógica com o web app
- Notificações push
- Leitura de QR Code nativa

---

## 📧 **Suporte**

Para dúvidas ou problemas, entre em contato:
- E-mail: suporte@appcorrespondencia.com.br

---

## 📄 **Licença**

Este projeto é privado e proprietário.
