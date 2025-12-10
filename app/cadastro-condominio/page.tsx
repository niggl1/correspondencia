"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { db, auth } from "@/app/lib/firebase";
import { createUserWithEmailAndPassword, signOut } from "firebase/auth";
import { collection, addDoc, setDoc, doc, serverTimestamp } from "firebase/firestore";
// 👇 Certifique-se que este arquivo existe em /app/utils/ ou ajuste o caminho
import { gerarAmbienteTeste } from "@/utils/gerarAmbienteTeste"; 

export default function CadastroCondominioPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [etapa, setEtapa] = useState(1);

  // Dados do condomínio
  const [nomeCondominio, setNomeCondominio] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [endereco, setEndereco] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  // Dados do responsável
  const [nomeResponsavel, setNomeResponsavel] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmarSenha, setMostrarConfirmarSenha] = useState(false);

  // Validações
  const validarEtapa1 = () => {
    if (!nomeCondominio.trim()) return alert("Nome do condomínio é obrigatório");
    if (!cnpj.trim()) return alert("CNPJ é obrigatório");
    if (!endereco.trim()) return alert("Endereço é obrigatório");
    return true;
  };

  const validarEtapa2 = () => {
    if (!nomeResponsavel.trim()) return alert("Nome do responsável é obrigatório");
    if (!email.trim() || !email.includes("@")) return alert("Email válido é obrigatório");
    if (!senha || senha.length < 6) return alert("Senha deve ter no mínimo 6 caracteres");
    if (senha !== confirmarSenha) return alert("As senhas não conferem");
    if (!whatsapp.trim()) return alert("WhatsApp é obrigatório");
    return true;
  };

  const avancarParaEtapa2 = () => validarEtapa1() && setEtapa(2);
  const voltarParaEtapa1 = () => setEtapa(1);

  const finalizarCadastro = async () => {
    if (!validarEtapa2()) return;

    try {
      setLoading(true);

      // 1. Primeiro cria a autenticação do Responsável
      const userCredential = await createUserWithEmailAndPassword(auth, email, senha);
      const uid = userCredential.user.uid;

      // 2. Com o usuário autenticado, cria o condomínio
      const condominioRef = await addDoc(collection(db, "condominios"), {
        nome: nomeCondominio,
        cnpj,
        endereco,
        logoUrl: logoUrl || "",
        status: "ativo",
        criadoPor: uid,
        criadoEm: serverTimestamp(),
      });

      // 3. Salva os dados do usuário no Firestore vinculado ao novo condomínio
      const userRef = doc(db, "users", uid);
      await setDoc(userRef, {
        uid,
        nome: nomeResponsavel,
        email,
        whatsapp,
        role: "responsavel",
        status: "ativo",
        condominioId: condominioRef.id,
        criadoEm: serverTimestamp(),
      });

      // 4. 🚀 GERA O AMBIENTE DE TESTE AUTOMATICAMENTE
      try {
          await gerarAmbienteTeste({
            condominioId: condominioRef.id,
            condominioNome: nomeCondominio,
            whatsappDestino: whatsapp
          });
      } catch (error) {
          console.warn("⚠️ Aviso: Ambiente de teste não gerado (função auxiliar pode estar faltando ou erro de rede). O cadastro principal continua válido.", error);
      }

      // Faz logout para que o usuário faça login oficialmente na tela de login
      await signOut(auth);

      alert(
        `✅ Condomínio cadastrado com sucesso!\n\nCriamos também um "Morador de Teste" para você validar o sistema.\n\nFaça login para começar.`
      );

      router.push("/"); 
    } catch (err: any) {
      console.error("❌ Erro:", err);

      if (err.code === "auth/email-already-in-use") alert("Este email já está cadastrado.");
      else if (err.code === "auth/invalid-email") alert("Email inválido.");
      else if (err.code === "auth/weak-password") alert("Senha muito fraca.");
      else alert("Erro ao cadastrar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    // AJUSTE MOBILE: Container scrollável, altura dinâmica e padding para Notch
    <div 
        className="bg-gradient-to-br from-green-50 to-emerald-100 flex justify-center p-4 w-full overflow-y-auto"
        style={{ 
            minHeight: '100dvh',
            paddingTop: 'max(1.5rem, env(safe-area-inset-top))',
            paddingBottom: '2rem'
        }}
    >
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md my-auto h-fit">
        
        {/* Cabeçalho */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-4">
            <svg
              className="w-12 h-12"
              style={{ color: "#057321" }}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
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
              : "Agora, os dados do responsável"}
          </p>
        </div>

        {/* Indicador de etapas */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
              etapa === 1 ? "text-white bg-[#057321]" : "text-white bg-[#057321]"
            }`}
          >
            {etapa === 1 ? "1" : "✓"}
          </div>

          <div className="w-16 h-1 bg-gray-300"></div>

          <div
            className={`flex items-center justify-center w-10 h-10 rounded-full font-bold ${
              etapa === 2 ? "text-white bg-[#057321]" : "bg-gray-300 text-gray-700"
            }`}
          >
            2
          </div>
        </div>

        {/* Etapa 1 */}
        {etapa === 1 && (
          <div className="space-y-4">

            <Input
              label="Nome do Condomínio"
              required
              value={nomeCondominio}
              onChange={setNomeCondominio}
            />

            <Input
              label="CNPJ do Condomínio"
              required
              value={cnpj}
              onChange={setCnpj}
              placeholder="00.000.000/0000-00"
            />

            <TextArea
              label="Endereço Completo"
              required
              value={endereco}
              onChange={setEndereco}
            />

            <Input
              type="url"
              label="URL do Logo (Opcional)"
              value={logoUrl}
              onChange={setLogoUrl}
            />

            {logoUrl && (
              <img
                src={logoUrl}
                alt="Preview"
                className="w-24 h-24 rounded-lg object-cover border-2 border-gray-200 mx-auto"
                onError={(e) => ((e.target as HTMLImageElement).style.display = "none")}
              />
            )}

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => router.push("/")} 
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 active:bg-gray-100 transition"
              >
                Cancelar
              </button>

              <button
                onClick={avancarParaEtapa2}
                className="flex-1 px-6 py-3 bg-[#057321] text-white rounded-lg font-medium hover:bg-[#045a1a] active:scale-[0.98] transition"
              >
                Próximo →
              </button>
            </div>
          </div>
        )}

        {/* Etapa 2 */}
        {etapa === 2 && (
          <div className="space-y-4">

            <Input
              label="Nome do Responsável"
              required
              value={nomeResponsavel}
              onChange={setNomeResponsavel}
            />

            <Input
              type="email"
              label="Email do Responsável"
              required
              value={email}
              onChange={setEmail}
            />

            <PasswordInput
              label="Senha"
              required
              value={senha}
              onChange={setSenha}
              mostrar={mostrarSenha}
              setMostrar={setMostrarSenha}
            />

            <PasswordInput
              label="Confirmar Senha"
              required
              value={confirmarSenha}
              onChange={setConfirmarSenha}
              mostrar={mostrarConfirmarSenha}
              setMostrar={setMostrarConfirmarSenha}
            />

            <Input
              type="tel"
              label="WhatsApp do Responsável"
              required
              value={whatsapp}
              onChange={setWhatsapp}
              placeholder="(00) 00000-0000"
            />

            <div className="flex gap-3 mt-6">
              <button
                onClick={voltarParaEtapa1}
                className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 active:bg-gray-100 transition"
              >
                ← Voltar
              </button>

              <button
                onClick={finalizarCadastro}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-[#057321] text-white rounded-lg font-medium hover:bg-[#045a1a] disabled:opacity-50 active:scale-[0.98] transition"
              >
                {loading ? "Cadastrando..." : "Finalizar"}
              </button>
            </div>

          </div>
        )}

        {/* Link Login */}
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Já tem uma conta?{" "}
            <a href="/" className="text-[#057321] hover:text-[#045a1a] font-medium">
              Fazer Login
            </a>
          </p>
        </div>

      </div>
    </div>
  );
}

/* ---------------------- */
/* COMPONENTES AJUSTADOS  */
/* ---------------------- */

function Input({ label, required, value, onChange, type = "text", placeholder = "" }: any) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {/* AJUSTE: text-base evita zoom no iPhone */}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:ring-[#057321] focus:border-[#057321]"
      />
    </div>
  );
}

function TextArea({ label, required, value, onChange }: any) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {/* AJUSTE: text-base evita zoom no iPhone */}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={3}
        className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:ring-[#057321] focus:border-[#057321]"
      ></textarea>
    </div>
  );
}

function PasswordInput({
  label,
  required,
  value,
  onChange,
  mostrar,
  setMostrar,
}: any) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>

      <div className="relative">
        {/* AJUSTE: text-base evita zoom no iPhone */}
        <input
          type={mostrar ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 pr-12 text-base focus:ring-[#057321] focus:border-[#057321]"
        />

        <button
          type="button"
          onClick={() => setMostrar(!mostrar)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 p-2"
        >
          {mostrar ? (
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
  );
}