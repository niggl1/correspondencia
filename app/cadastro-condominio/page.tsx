"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "@/app/lib/firebase";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, addDoc, setDoc, doc, serverTimestamp } from "firebase/firestore";

export default function CadastroCondominioPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [etapa, setEtapa] = useState(1); // 1 = Condomínio, 2 = Responsável

  // Dados do Condomínio
  const [nomeCondominio, setNomeCondominio] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [endereco, setEndereco] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  // Dados do Responsável
  const [nomeResponsavel, setNomeResponsavel] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);

  // Validar Etapa 1 (Condomínio)
  const validarEtapa1 = () => {
    if (!nomeCondominio.trim()) {
      alert("Nome do condomínio é obrigatório");
      return false;
    }
    if (!cnpj.trim()) {
      alert("CNPJ é obrigatório");
      return false;
    }
    if (!endereco.trim()) {
      alert("Endereço é obrigatório");
      return false;
    }
    return true;
  };

  // Validar Etapa 2 (Responsável)
  const validarEtapa2 = () => {
    if (!nomeResponsavel.trim()) {
      alert("Nome do responsável é obrigatório");
      return false;
    }
    if (!email.trim() || !email.includes("@")) {
      alert("Email válido é obrigatório");
      return false;
    }
    if (!senha || senha.length < 6) {
      alert("Senha deve ter no mínimo 6 caracteres");
      return false;
    }
    if (senha !== confirmarSenha) {
      alert("As senhas não conferem");
      return false;
    }
    if (!whatsapp.trim()) {
      alert("WhatsApp é obrigatório");
      return false;
    }
    return true;
  };

  // Avançar para Etapa 2
  const avancarParaEtapa2 = () => {
    if (validarEtapa1()) {
      setEtapa(2);
    }
  };

  // Voltar para Etapa 1
  const voltarParaEtapa1 = () => {
    setEtapa(1);
  };

  // Finalizar Cadastro
  const finalizarCadastro = async () => {
    if (!validarEtapa2()) {
      return;
    }

    try {
      setLoading(true);
      console.log("🏢 Iniciando cadastro de condomínio...");

      // 1. Criar condomínio no Firestore
      const condominioRef = await addDoc(collection(db, "condominios"), {
        nome: nomeCondominio,
        cnpj,
        endereco,
        logoUrl: logoUrl || "",
        status: "ativo",
        criadoEm: serverTimestamp(),
      });
      const condominioId = condominioRef.id;
      console.log("✅ Condomínio criado:", condominioId);

      // 2. Criar usuário responsável no Firebase Authentication
      console.log("🔐 Criando responsável no Firebase Authentication...");
      const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
      const uid = userCredential.user.uid;
      console.log("✅ Responsável criado no Authentication:", uid);

      // 3. Salvar dados do responsável no Firestore
      await setDoc(doc(db, "users", uid), {
        uid,
        nome: nomeResponsavel,
        email,
        whatsapp,
        role: "responsavel",
        status: "ativo",
        condominioId,
        criadoEm: serverTimestamp(),
      });
      console.log("✅ Dados do responsável salvos no Firestore");

      // 4. Fazer logout automático
      await signOut(auth);
      console.log("✅ Logout automático");

      // 5. Mostrar mensagem de sucesso e redirecionar
      alert(
        `✅ Condomínio cadastrado com sucesso!\n\n` +
        `Você já pode fazer login com:\n` +
        `Email: ${email}\n\n` +
        `Você será redirecionado para a tela de login.`
      );

      router.push("/login");
    } catch (err: any) {
      console.error("❌ Erro ao cadastrar:", err);

      // Mensagens de erro amigáveis
      if (err.code === "auth/email-already-in-use") {
        alert("Este email já está cadastrado. Use outro email ou faça login.");
      } else if (err.code === "auth/invalid-email") {
        alert("Email inválido");
      } else if (err.code === "auth/weak-password") {
        alert("Senha muito fraca (mínimo 6 caracteres)");
      } else {
        alert("Erro ao cadastrar: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        {/* Cabeçalho */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <svg className="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
              />
            </svg>
            <h1 className="text-3xl font-bold text-gray-900">Cadastrar Condomínio</h1>
          </div>
          <p className="text-gray-600">
            {etapa === 1
              ? "Preencha os dados do seu condomínio"
              : "Agora, seus dados como responsável"}
          </p>
        </div>

        {/* Indicador de Etapas */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full ${
              etapa === 1 ? "bg-blue-600 text-white" : "bg-green-500 text-white"
            }`}
          >
            {etapa === 1 ? "1" : "✓"}
          </div>
          <div className="w-16 h-1 bg-gray-300"></div>
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full ${
              etapa === 2 ? "bg-blue-600 text-white" : "bg-gray-300 text-gray-600"
            }`}
          >
            2
          </div>
        </div>

        {/* Etapa 1: Dados do Condomínio */}
        {etapa === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Condomínio <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={nomeCondominio}
                onChange={(e) => setNomeCondominio(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Edifício Domínio"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                CNPJ do Condomínio <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="00.000.000/0001-00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Endereço Completo <span className="text-red-500">*</span>
              </label>
              <textarea
                value={endereco}
                onChange={(e) => setEndereco(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Rua das Flores, 123, Centro - Recife/PE"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                URL do Logo (Opcional)
              </label>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="https://exemplo.com/logo.png"
              />
              <p className="text-xs text-gray-500 mt-1">Cole a URL de uma imagem hospedada online</p>
            </div>

            {logoUrl && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Preview</label>
                <img
                  src={logoUrl}
                  alt="Preview"
                  className="w-24 h-24 rounded-lg object-cover border-2 border-gray-200"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => router.push("/login")}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={avancarParaEtapa2}
                className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                Próximo →
              </button>
            </div>
          </div>
        )}

        {/* Etapa 2: Dados do Responsável */}
        {etapa === 2 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nome do Responsável <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={nomeResponsavel}
                onChange={(e) => setNomeResponsavel(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="João Silva"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email do Responsável <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="sindico@exemplo.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Senha <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={mostrarSenha ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {mostrarSenha ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">Mínimo de 6 caracteres</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar Senha <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type={mostrarConfirmarSenha ? "text" : "password"}
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••"
                />
                <button
                  type="button"
                  onClick={() => setMostrarConfirmarSenha(!mostrarConfirmarSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {mostrarConfirmarSenha ? (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                WhatsApp do Responsável <span className="text-red-500">*</span>
              </label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="(81) 99961-8516"
              />
              <p className="text-xs text-gray-500 mt-1">Com DDD</p>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={voltarParaEtapa1}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
              >
                ← Voltar
              </button>
              <button
                onClick={finalizarCadastro}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 disabled:opacity-50"
              >
                {loading ? "Cadastrando..." : "Finalizar Cadastro"}
              </button>
            </div>
          </div>
        )}

        {/* Link para Login */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Já tem uma conta?{" "}
            <a href="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Fazer Login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}