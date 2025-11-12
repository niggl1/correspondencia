// app/cadastro-morador/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/app/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";

export default function CadastroMoradorPage() {
  const router = useRouter();
  const [etapa, setEtapa] = useState(1); // 1: CNPJ, 2: Dados do morador, 3: Senha
  
  // Etapa 1
  const [cnpj, setCnpj] = useState("");
  const [condominioEncontrado, setCondominioEncontrado] = useState<any>(null);
  const [blocos, setBlocos] = useState<any[]>([]);
  const [unidades, setUnidades] = useState<any[]>([]);
  
  // Etapa 2
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [perfil, setPerfil] = useState("proprietario");
  const [blocoId, setBlocoId] = useState("");
  const [unidadeId, setUnidadeId] = useState("");
  
  // Etapa 3
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState("");

  const PERFIS = [
    { value: "proprietario", label: "Proprietário" },
    { value: "locatario", label: "Locatário" },
    { value: "dependente", label: "Dependente" },
    { value: "funcionario", label: "Funcionário" },
    { value: "outro", label: "Outro" },
  ];

  // Buscar condomínio por CNPJ
  const buscarCondominio = async () => {
    if (!cnpj.trim()) {
      setErro("Digite o CNPJ do condomínio");
      return;
    }

    setLoading(true);
    setErro("");

    try {
      // Buscar condomínio por CNPJ
      const q = query(
        collection(db, "condominios"),
        where("cnpj", "==", cnpj.trim())
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        setErro("Condomínio não encontrado. Verifique o CNPJ.");
        setLoading(false);
        return;
      }

      const condominioData = {
        id: snapshot.docs[0].id,
        ...snapshot.docs[0].data(),
      };

      setCondominioEncontrado(condominioData);

      // Carregar blocos do condomínio
      await carregarBlocos(condominioData.id);

      // Carregar unidades do condomínio
      await carregarUnidades(condominioData.id);

      setEtapa(2);
    } catch (err: any) {
      console.error("Erro ao buscar condomínio:", err);
      setErro("Erro ao buscar condomínio. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  const carregarBlocos = async (condominioId: string) => {
    try {
      const q = query(
        collection(db, "blocos"),
        where("condominioId", "==", condominioId)
      );

      const snapshot = await getDocs(q);
      const blocosData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setBlocos(blocosData);
    } catch (err) {
      console.error("Erro ao carregar blocos:", err);
    }
  };

  const carregarUnidades = async (condominioId: string) => {
    try {
      const q = query(
        collection(db, "unidades"),
        where("condominioId", "==", condominioId)
      );

      const snapshot = await getDocs(q);
      const unidadesData = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      setUnidades(unidadesData);
    } catch (err) {
      console.error("Erro ao carregar unidades:", err);
    }
  };

  // Validar dados e ir para etapa de senha
  const validarDados = () => {
    if (!nome.trim()) {
      setErro("Preencha seu nome completo");
      return;
    }

    if (!email.trim() || !email.includes("@")) {
      setErro("Preencha um email válido");
      return;
    }

    if (!whatsapp.trim()) {
      setErro("Preencha seu WhatsApp");
      return;
    }

    if (!unidadeId) {
      setErro("Selecione sua unidade");
      return;
    }

    setErro("");
    setEtapa(3);
  };

  // ✅ NOVO: Função para enviar email de confirmação
  const enviarEmailConfirmacao = async () => {
    try {
      const unidadeSelecionada = unidades.find((u) => u.id === unidadeId);
      const blocoSelecionado = blocos.find((b) => b.id === blocoId);

      const response = await fetch('/api/enviar-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tipo: 'confirmacao',
          destinatario: {
            nome: nome,
            email: email,
          },
          dados: {
            condominioNome: condominioEncontrado.nome,
            blocoNome: blocoSelecionado?.nome || '',
            numeroUnidade: unidadeSelecionada?.identificacao || '',
          },
        }),
      });

      if (!response.ok) {
        console.error('Erro ao enviar email de confirmação');
      } else {
        console.log('✅ Email de confirmação enviado com sucesso!');
      }
    } catch (error) {
      console.error('Erro ao enviar email:', error);
    }
  };

  // Criar conta
  const criarConta = async () => {
    if (!senha.trim() || senha.length < 6) {
      setErro("A senha deve ter no mínimo 6 caracteres");
      return;
    }

    if (senha !== confirmarSenha) {
      setErro("As senhas não coincidem");
      return;
    }

    setLoading(true);
    setErro("");

    try {
      // Criar conta no Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth as any,
        email,
        senha
      );

      const unidadeSelecionada = unidades.find((u) => u.id === unidadeId);
      const blocoSelecionado = blocos.find((b) => b.id === blocoId);

      // Salvar morador no Firestore (pendente de aprovação)
      await setDoc(doc(db, "moradores", userCredential.user.uid), {
        nome,
        email,
        whatsapp,
        perfil,
        perfilMorador: perfil,
        unidadeId,
        unidadeNome: unidadeSelecionada?.identificacao || "",
        numeroUnidade: unidadeSelecionada?.identificacao || "",
        blocoId: blocoId || "",
        blocoNome: blocoSelecionado?.nome || "",
        condominioId: condominioEncontrado.id,
        condominioNome: condominioEncontrado.nome,
        role: "morador",
        ativo: false, // Inativo até aprovação
        aprovado: false, // Pendente de aprovação
        criadoEm: new Date(),
      });

      // ✅ NOVO: Enviar email de confirmação
      await enviarEmailConfirmacao();

      alert(
        "✅ Cadastro realizado com sucesso!\n\n" +
          "Sua conta foi criada e está aguardando aprovação do responsável do condomínio.\n\n" +
          "Você receberá uma notificação por email quando sua conta for aprovada."
      );

      router.push("/login");
    } catch (err: any) {
      console.error("Erro ao criar conta:", err);
      if (err.code === "auth/email-already-in-use") {
        setErro("Este email já está cadastrado");
      } else {
        setErro("Erro ao criar conta. Tente novamente.");
      }
    } finally {
      setLoading(false);
    }
  };

  const unidadesFiltradas = blocoId
    ? unidades.filter((u) => u.blocoId === blocoId)
    : unidades;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-green-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6">
        {/* Header */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#057321] rounded-full mb-4">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
              />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Cadastro de Morador</h1>
          <p className="text-gray-600">
            {etapa === 1 && "Informe o CNPJ do condomínio"}
            {etapa === 2 && "Preencha seus dados"}
            {etapa === 3 && "Crie sua senha"}
          </p>
        </div>

        {/* Indicador de etapas */}
        <div className="flex items-center justify-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${etapa >= 1 ? "bg-[#057321] text-white" : "bg-gray-200 text-gray-500"}`}>
            1
          </div>
          <div className={`w-12 h-1 ${etapa >= 2 ? "bg-[#057321]" : "bg-gray-200"}`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${etapa >= 2 ? "bg-[#057321] text-white" : "bg-gray-200 text-gray-500"}`}>
            2
          </div>
          <div className={`w-12 h-1 ${etapa >= 3 ? "bg-[#057321]" : "bg-gray-200"}`}></div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${etapa >= 3 ? "bg-[#057321] text-white" : "bg-gray-200 text-gray-500"}`}>
            3
          </div>
        </div>

        {/* Mensagem de erro */}
        {erro && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {erro}
          </div>
        )}

        {/* ETAPA 1: CNPJ */}
        {etapa === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CNPJ do Condomínio
              </label>
              <input
                type="text"
                value={cnpj}
                onChange={(e) => setCnpj(e.target.value)}
                placeholder="00.000.000/0000-00"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#057321] focus:border-transparent"
              />
            </div>

            <button
              onClick={buscarCondominio}
              disabled={loading}
              className="w-full bg-[#057321] text-white py-3 rounded-lg font-semibold hover:bg-[#046119] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Buscando..." : "Continuar"}
            </button>
          </div>
        )}

        {/* ETAPA 2: Dados do morador */}
        {etapa === 2 && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Condomínio:</strong> {condominioEncontrado?.nome}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Completo
              </label>
              <input
                type="text"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Seu nome completo"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#057321] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#057321] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                WhatsApp
              </label>
              <input
                type="tel"
                value={whatsapp}
                onChange={(e) => setWhatsapp(e.target.value)}
                placeholder="(00) 00000-0000"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#057321] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Perfil
              </label>
              <select
                value={perfil}
                onChange={(e) => setPerfil(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#057321] focus:border-transparent"
              >
                {PERFIS.map((p) => (
                  <option key={p.value} value={p.value}>
                    {p.label}
                  </option>
                ))}
              </select>
            </div>

            {blocos.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bloco
                </label>
                <select
                  value={blocoId}
                  onChange={(e) => {
                    setBlocoId(e.target.value);
                    setUnidadeId(""); // Resetar unidade ao mudar bloco
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#057321] focus:border-transparent"
                >
                  <option value="">Selecione o bloco</option>
                  {blocos.map((bloco) => (
                    <option key={bloco.id} value={bloco.id}>
                      {bloco.nome}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Unidade
              </label>
              <select
                value={unidadeId}
                onChange={(e) => setUnidadeId(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#057321] focus:border-transparent"
              >
                <option value="">Selecione a unidade</option>
                {unidadesFiltradas.map((unidade) => (
                  <option key={unidade.id} value={unidade.id}>
                    {unidade.identificacao}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEtapa(1)}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
              >
                Voltar
              </button>
              <button
                onClick={validarDados}
                className="flex-1 bg-[#057321] text-white py-3 rounded-lg font-semibold hover:bg-[#046119] transition-colors"
              >
                Continuar
              </button>
            </div>
          </div>
        )}

        {/* ETAPA 3: Senha */}
        {etapa === 3 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#057321] focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Senha
              </label>
              <input
                type="password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                placeholder="Digite a senha novamente"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#057321] focus:border-transparent"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setEtapa(2)}
                disabled={loading}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition-colors disabled:opacity-50"
              >
                Voltar
              </button>
              <button
                onClick={criarConta}
                disabled={loading}
                className="flex-1 bg-[#057321] text-white py-3 rounded-lg font-semibold hover:bg-[#046119] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Criando..." : "Criar Conta"}
              </button>
            </div>
          </div>
        )}

        {/* Link para login */}
        <div className="text-center text-sm text-gray-600">
          Já tem uma conta?{" "}
          <button
            onClick={() => router.push("/login")}
            className="text-[#057321] font-semibold hover:underline"
          >
            Fazer login
          </button>
        </div>
      </div>
    </div>
  );
}