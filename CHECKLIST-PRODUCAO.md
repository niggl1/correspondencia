# ✅ **Checklist de Produção - AppCorrespondencia**

## 📋 **Antes do Deploy**

### **1. Configurações Locais**
- [ ] Todas as dependências instaladas (`npm install`)
- [ ] Projeto roda localmente sem erros (`npm run dev`)
- [ ] Build funciona sem erros (`npm run build`)
- [ ] Arquivo `.env.local` configurado corretamente
- [ ] Testes básicos funcionando (login, cadastro, etc.)

### **2. Repositório Git**
- [ ] Repositório criado no GitHub
- [ ] Arquivo `.gitignore` configurado
- [ ] Primeiro commit realizado
- [ ] Push para o GitHub concluído
- [ ] Repositório é privado (recomendado)

### **3. Firebase**
- [ ] Projeto criado no Firebase Console
- [ ] Authentication ativado (E-mail/Senha)
- [ ] Firestore Database criado
- [ ] Storage ativado
- [ ] Regras de segurança do Firestore publicadas
- [ ] Domínios autorizados configurados

### **4. Resend (E-mail)**
- [ ] Conta criada no Resend
- [ ] Domínio verificado
- [ ] API Key gerada
- [ ] E-mail de remetente configurado

---

## 🚀 **Durante o Deploy**

### **5. Vercel**
- [ ] Conta criada na Vercel
- [ ] GitHub conectado à Vercel
- [ ] Projeto importado
- [ ] Variáveis de ambiente configuradas
- [ ] Build concluído com sucesso
- [ ] Site acessível no domínio temporário

### **6. Variáveis de Ambiente na Vercel**
- [ ] `NEXT_PUBLIC_FIREBASE_API_KEY`
- [ ] `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- [ ] `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_APP_ID`
- [ ] `RESEND_API_KEY` (sem NEXT_PUBLIC_)
- [ ] `EMAIL_FROM`
- [ ] `NEXT_PUBLIC_BASE_URL`

---

## 🧪 **Após o Deploy**

### **7. Testes Funcionais**
- [ ] Site carrega corretamente
- [ ] Página de login acessível
- [ ] Login funciona com usuário de teste
- [ ] Dashboard do porteiro acessível
- [ ] Cadastro de correspondência funciona
- [ ] Upload de imagens funciona
- [ ] E-mail de notificação é enviado
- [ ] QR Code é gerado corretamente
- [ ] Retirada de correspondência funciona
- [ ] Dashboard do morador mostra correspondências

### **8. Testes de Segurança**
- [ ] Rotas protegidas não são acessíveis sem login
- [ ] Usuário não consegue acessar dados de outro condomínio
- [ ] Regras do Firestore estão funcionando
- [ ] Headers de segurança estão configurados
- [ ] Chaves de API não estão expostas no frontend

### **9. Performance**
- [ ] Site carrega em menos de 3 segundos
- [ ] Imagens estão otimizadas
- [ ] Lighthouse Score acima de 80
- [ ] Não há erros no console do navegador

---

## 🌐 **Domínio Personalizado (Opcional)**

### **10. Configuração de Domínio**
- [ ] Domínio registrado
- [ ] DNS configurado na Vercel
- [ ] Certificado SSL ativo
- [ ] Redirecionamento de www funcionando
- [ ] `NEXT_PUBLIC_BASE_URL` atualizado

---

## 📊 **Monitoramento**

### **11. Analytics e Logs**
- [ ] Vercel Analytics ativado
- [ ] Logs de erro configurados
- [ ] Monitoramento de uptime configurado (opcional)
- [ ] Sentry configurado (opcional)

---

## 🔄 **Manutenção Contínua**

### **12. Backups e Atualizações**
- [ ] Backup do Firestore configurado
- [ ] Dependências atualizadas regularmente
- [ ] Documentação atualizada
- [ ] Changelog mantido

---

## 🎉 **Projeto em Produção!**

Quando todos os itens estiverem marcados, seu projeto está oficialmente em produção e pronto para uso!

---

## 📞 **Suporte**

Se encontrar algum problema:
1. Verifique os logs na Vercel
2. Consulte a documentação do Firebase
3. Revise as configurações de variáveis de ambiente
4. Entre em contato com o suporte técnico
