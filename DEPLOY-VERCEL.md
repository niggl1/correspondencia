# 🚀 **Guia Completo de Deploy na Vercel**

## 📋 **Pré-requisitos**

- ✅ Conta no GitHub
- ✅ Conta na Vercel (gratuita)
- ✅ Projeto já configurado localmente
- ✅ Credenciais do Firebase
- ✅ Chave da API do Resend

---

## 🔧 **Passo 1: Preparar o Repositório no GitHub**

### **1.1. Criar repositório no GitHub**

1. Acesse [github.com](https://github.com)
2. Clique em **"New repository"**
3. Nome: `app-correspondencia` (ou o nome que preferir)
4. Deixe como **Private** (recomendado)
5. **NÃO** inicialize com README (já temos um)
6. Clique em **"Create repository"**

### **1.2. Fazer push do projeto**

No terminal, dentro da pasta do projeto:

```bash
# Inicializar Git (se ainda não foi feito)
git init

# Adicionar todos os arquivos
git add .

# Fazer o primeiro commit
git commit -m "Projeto pronto para produção"

# Conectar ao repositório remoto (substitua SEU-USUARIO)
git remote add origin https://github.com/SEU-USUARIO/app-correspondencia.git

# Fazer push
git branch -M main
git push -u origin main
```

---

## 🌐 **Passo 2: Deploy na Vercel**

### **2.1. Conectar GitHub à Vercel**

1. Acesse [vercel.com](https://vercel.com)
2. Clique em **"Sign Up"** ou **"Log In"**
3. Escolha **"Continue with GitHub"**
4. Autorize a Vercel a acessar seus repositórios

### **2.2. Importar o Projeto**

1. No dashboard da Vercel, clique em **"Add New..."** → **"Project"**
2. Encontre o repositório `app-correspondencia`
3. Clique em **"Import"**

### **2.3. Configurar o Projeto**

1. **Framework Preset:** Next.js (detectado automaticamente)
2. **Root Directory:** `.` (deixe como está)
3. **Build Command:** `npm run build` (padrão)
4. **Output Directory:** `.next` (padrão)

### **2.4. Adicionar Variáveis de Ambiente**

Clique em **"Environment Variables"** e adicione:

```
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyAzruTLO_g7UtNB5nWgsI-phczP9txTfIY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=app-correspondencia-1a054.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=app-correspondencia-1a054
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=app-correspondencia-1a054.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=706771378163
NEXT_PUBLIC_FIREBASE_APP_ID=1:706771378163:web:06d1a9765bede54631fc86
RESEND_API_KEY=re_7g4ouRFz_JjmRWu2VZCsc1VAVZNeh9jdx
EMAIL_FROM=correspondencia@appcorrespondencia.com.br
NEXT_PUBLIC_BASE_URL=https://app-correspondencia.vercel.app
```

⚠️ **IMPORTANTE:**
- Marque todas as variáveis para: **Production**, **Preview** e **Development**
- `RESEND_API_KEY` **NÃO** deve ter `NEXT_PUBLIC_`
- Atualize `NEXT_PUBLIC_BASE_URL` com o domínio final após o deploy

### **2.5. Fazer o Deploy**

1. Clique em **"Deploy"**
2. Aguarde o build finalizar (2-5 minutos)
3. ✅ Seu site estará no ar!

---

## 🔥 **Passo 3: Configurar Firestore**

### **3.1. Publicar Regras de Segurança**

1. Acesse [Firebase Console](https://console.firebase.google.com/)
2. Selecione seu projeto: **app-correspondencia-1a054**
3. Vá em **Firestore Database** → **Regras**
4. Copie o conteúdo do arquivo `firestore.rules` do projeto
5. Cole no editor de regras
6. Clique em **"Publicar"**

### **3.2. Verificar Autenticação**

1. Vá em **Authentication** → **Sign-in method**
2. Certifique-se de que **E-mail/Senha** está ativado
3. Em **Authorized domains**, adicione seu domínio da Vercel:
   - `app-correspondencia.vercel.app`
   - Se tiver domínio próprio, adicione também

---

## 🌐 **Passo 4: Configurar Domínio Personalizado (Opcional)**

### **4.1. Adicionar Domínio na Vercel**

1. No dashboard da Vercel, vá no seu projeto
2. Clique em **"Settings"** → **"Domains"**
3. Clique em **"Add"**
4. Digite seu domínio: `appcorrespondencia.com.br`
5. Siga as instruções para configurar os DNS

### **4.2. Configurar DNS**

No seu provedor de domínio (Registro.br, GoDaddy, etc.):

**Tipo A:**
```
Host: @
Valor: 76.76.21.21
```

**Tipo CNAME:**
```
Host: www
Valor: cname.vercel-dns.com
```

### **4.3. Atualizar Variáveis de Ambiente**

Após configurar o domínio:

1. Vá em **Settings** → **Environment Variables**
2. Edite `NEXT_PUBLIC_BASE_URL`
3. Mude para: `https://appcorrespondencia.com.br`
4. Salve e faça **Redeploy**

---

## ✅ **Passo 5: Verificar Funcionamento**

### **5.1. Checklist de Testes**

- [ ] Site carrega corretamente
- [ ] Login funciona
- [ ] Cadastro de correspondência funciona
- [ ] E-mails são enviados
- [ ] Imagens são carregadas
- [ ] Dashboard de cada perfil funciona

### **5.2. Monitoramento**

1. Vá em **Analytics** na Vercel para ver métricas
2. Configure **Vercel Speed Insights** (opcional)
3. Configure **Sentry** para monitoramento de erros (opcional)

---

## 🔄 **Passo 6: Atualizações Futuras**

### **Deploy Automático**

Agora, sempre que você fizer um push para o GitHub:

```bash
git add .
git commit -m "Descrição da alteração"
git push
```

A Vercel automaticamente:
1. Detecta o push
2. Faz o build
3. Faz o deploy
4. Notifica você por e-mail

---

## 🆘 **Problemas Comuns**

### **Erro: "Build failed"**

**Solução:**
1. Verifique os logs de build na Vercel
2. Certifique-se de que todas as dependências estão no `package.json`
3. Teste o build localmente: `npm run build`

### **Erro: "Firebase Auth domain not authorized"**

**Solução:**
1. Vá no Firebase Console
2. Authentication → Settings → Authorized domains
3. Adicione o domínio da Vercel

### **E-mails não estão sendo enviados**

**Solução:**
1. Verifique se `RESEND_API_KEY` está configurada (sem `NEXT_PUBLIC_`)
2. Verifique se o domínio está verificado no Resend
3. Confira os logs da API route `/api/enviar-email`

---

## 📞 **Suporte**

Se precisar de ajuda adicional:
- Documentação da Vercel: [vercel.com/docs](https://vercel.com/docs)
- Documentação do Next.js: [nextjs.org/docs](https://nextjs.org/docs)
- Firebase: [firebase.google.com/docs](https://firebase.google.com/docs)

---

**Parabéns! Seu projeto está no ar! 🎉**
