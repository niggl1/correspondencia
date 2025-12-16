"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { auth, db } from "@/app/lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc, collection, query, where, getDocs } from "firebase/firestore";
// 🔥 AJUSTE: Uso de alias '@/' para evitar erros de caminho relativo
import { enviarConfirmacaoCadastro } from '@/app/lib/email-helper';

export default function CadastroMoradorPage() {
  const router = useRouter();
  const [etapa, setEtapa] = useState(1);
  
  const [cnpj, setCnpj] = useState("");
  const [condominioEncontrado, setCondominioEncontrado] = useState<any>(null);
  const [blocos, setBlocos] = useState<any[]>([]);
  
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [perfil, setPerfil] = useState("proprietario");
  
  const [blocoId, setBlocoId] = useState("");
  
  // Novos campos para input manual
  const [numeroUnidade, setNumeroUnidade] = useState("");
  const [complementoUnidade, setComplementoUnidade] = useState("");

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

  // 🔥 NOVA FUNÇÃO DE FORMATAÇÃO DE TELEFONE
  const formatarTelefone = (valor: string) => {
    // Remove tudo que não é número
    let v = valor.replace(/\D/g, "");
    
    // Limita a 11 dígitos
    v = v.substring(0, 11);

    // Aplica a máscara passo a passo
    if (v.length > 10) {
      // Formato Celular: (11) 99999-9999
      return v.replace(/^(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
    }
    if (v.length > 6) {
      // Formato Fixo/Incompleto: (11) 9999-9999
      return v.replace(/^(\d{2})(\d{4})(\d{0,4})/, "($1) $2-$3");
    }
    if (v.length > 2) {
      // Apenas DDD + começo: (11) 9...
      return v.replace(/^(\d{2})(\d{0,5})/, "($1) $2");
    }
    if (v.length > 0) {
      // Apenas DDD: (11...
      return v.replace(/^(\d{0,2})/, "($1");
    }
    return v;
  };

  const buscarCondominio = async () => {
    if (!cnpj.trim()) {
      setErro("Digite o CNPJ do condomínio");
      return;
    }

    setLoading(true);
    setErro("");

    try {
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

      const data = snapshot.docs[0].data();
      const condominioData = {
        id: snapshot.docs[0].id,
        ...data,
        nome: data.nome || "Condomínio", 
      };

      setCondominioEncontrado(condominioData);
      
      // Buscar apenas Blocos agora (Unidades serão digitadas)
      await carregarBlocos(condominioData.id);

      setEtapa(2);
    } catch (err: any) {
      console.error("❌ Erro ao buscar condomínio:", err);
      if (err.code === 'permission-denied') {
        setErro("Erro de permissão. Contate o administrador para liberar o acesso público ao banco de dados.");
      } else {
        setErro("Erro ao conectar. Verifique sua internet.");
      }
    } finally {
      setLoading(false);
    }
  };

  const carregarBlocos = async (condId: string) => {
    try {
      const q = query(
        collection(db, "blocos"),
        where("condominioId", "==", condId)
      );
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ 
        id: d.id, 
        ...d.data(),
        nome: d.data().nome || "Sem Nome"
      }));
      
      list.sort((a: any, b: any) => a.nome.localeCompare(b.nome));
      setBlocos(list);
    } catch (error) {
      console.error("Erro ao carregar blocos:", error);
    }
  };

  const validarEtapa2 = () => {
    if (!nome.trim()) return setErro("Nome é obrigatório");
    if (!email.trim()) return setErro("Email é obrigatório");
    if (!whatsapp.trim()) return setErro("WhatsApp é obrigatório");
    
    if (blocos.length > 0 && !blocoId) return setErro("Selecione o bloco");
    
    if (!numeroUnidade.trim()) return setErro("Digite o número da sua unidade");
    
    setErro("");
    setEtapa(3);
  };

  const criarConta = async () => {
    if (senha.length < 6) return setErro("Senha deve ter 6+ caracteres");
    if (senha !== confirmarSenha) return setErro("Senhas não conferem");

    setLoading(true);
    setErro("");

    try {
      const cred = await createUserWithEmailAndPassword(auth as any, email, senha);
      
      const blocoSel = blocos.find(b => b.id === blocoId);
      
      // Montar identificação da unidade (Ex: 101 Bloco A)
      const identificacaoUnidade = complementoUnidade 
        ? `${numeroUnidade} ${complementoUnidade}`
        : numeroUnidade;

      // Nome completo para exibição (Unidade + Bloco se houver)
      const unidadeNomeCompleto = blocoSel 
        ? `${identificacaoUnidade} - ${blocoSel.nome}` 
        : identificacaoUnidade;

      await setDoc(doc(db, "moradores", cred.user.uid), {
        nome,
        email,
        whatsapp, // Salva já formatado ou limpe aqui se preferir salvar só números: whatsapp.replace(/\D/g, "")
        perfil,
        perfilMorador: perfil,
        condominioId: condominioEncontrado.id,
        condominioNome: condominioEncontrado.nome,
        
        blocoId: blocoId || "",
        blocoNome: blocoSel?.nome || "",
        
        // Campos ajustados para texto livre
        unidadeId: "manual", 
        unidadeNome: unidadeNomeCompleto, 
        numeroUnidade: identificacaoUnidade,
        
        role: "morador",
        ativo: false,
        aprovado: false,
        criadoEm: new Date()
      });

      // 🔥 Envio de Email de Confirmação (Integrado)
      try {
        console.log("📧 Enviando e-mail de confirmação...");
        await enviarConfirmacaoCadastro(
          email,
          nome,
          condominioEncontrado.nome,
          blocoSel?.nome || "N/A",
          identificacaoUnidade
        );
        console.log("✅ E-mail enviado!");
      } catch (e) {
        console.warn("⚠️ Falha ao enviar e-mail (não impede o cadastro):", e);
      }

      alert("Cadastro realizado! Aguarde aprovação.");
      router.push("/"); // ✅ CORREÇÃO: Redireciona para o Login (Raiz)

    } catch (err: any) {
      console.error("Erro:", err);
      if (err.code === 'auth/email-already-in-use') setErro("Email já cadastrado");
      else setErro("Erro ao criar conta: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
        className="bg-green-50 flex justify-center p-4 w-full overflow-y-auto"
        style={{ 
            minHeight: '100dvh',
            paddingTop: 'max(1rem, env(safe-area-inset-top))',
            paddingBottom: '2rem'
        }}
    >
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-lg space-y-6 my-auto h-fit">
        
        <div className="text-center">
          <div className="mx-auto w-16 h-16 bg-[#057321] rounded-full flex items-center justify-center mb-4">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Cadastro de Morador</h1>
          <p className="text-gray-500 text-sm">Passo {etapa} de 3</p>
        </div>

        {erro && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm border border-red-200">
            {erro}
          </div>
        )}

        {/* Etapa 1 */}
        {etapa === 1 && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">CNPJ do Condomínio</label>
              <input 
                value={cnpj} 
                onChange={e => setCnpj(e.target.value)} 
                className="w-full border border-gray-300 rounded-lg px-4 py-3 text-base focus:ring-2 focus:ring-[#057321] focus:border-transparent"
                placeholder="00.000.000/0000-00"
              />
            </div>
            <button 
              onClick={buscarCondominio} 
              disabled={loading}
              className="w-full bg-[#057321] text-white py-3 rounded-lg font-semibold hover:bg-[#046119] disabled:opacity-50 transition active:scale-[0.98]"
            >
              {loading ? "Buscando..." : "Continuar"}
            </button>
          </div>
        )}

        {/* Etapa 2 */}
        {etapa === 2 && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 p-3 rounded-lg text-sm text-green-800">
              <strong>Condomínio:</strong> {condominioEncontrado?.nome}
            </div>

            <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Nome Completo" className="w-full px-4 py-3 border rounded-lg text-base" />
            <input value={email} onChange={e => setEmail(e.target.value)} placeholder="Email" className="w-full px-4 py-3 border rounded-lg text-base" />
            
            {/* 🔥 INPUT DE WHATSAPP ATUALIZADO */}
            <input 
              value={whatsapp} 
              onChange={e => setWhatsapp(formatarTelefone(e.target.value))} 
              placeholder="(DDD) 99999-9999" 
              maxLength={15} // Limita o tamanho máximo
              className="w-full px-4 py-3 border rounded-lg text-base" 
            />
            
            <select value={perfil} onChange={e => setPerfil(e.target.value)} className="w-full px-4 py-3 border rounded-lg bg-white text-base">
              {PERFIS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>

            {blocos.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Bloco / Setor</label>
                <select 
                  value={blocoId} 
                  onChange={e => setBlocoId(e.target.value)} 
                  className="w-full px-4 py-3 border rounded-lg bg-white text-base"
                >
                  <option value="">Selecione...</option>
                  {blocos.map(b => <option key={b.id} value={b.id}>{b.nome}</option>)}
                </select>
              </div>
            )}

            {/* Campos Manuais de Unidade */}
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nº Unidade</label>
                <input 
                  value={numeroUnidade} 
                  onChange={e => setNumeroUnidade(e.target.value)} 
                  placeholder="Ex: 101" 
                  className="w-full px-4 py-3 border rounded-lg text-base" 
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Complemento</label>
                <input 
                  value={complementoUnidade} 
                  onChange={e => setComplementoUnidade(e.target.value)} 
                  placeholder="Ex: A, Sul" 
                  className="w-full px-4 py-3 border rounded-lg text-base" 
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={() => setEtapa(1)} className="flex-1 bg-gray-200 py-3 rounded-lg font-semibold active:bg-gray-300">Voltar</button>
              <button onClick={validarEtapa2} className="flex-1 bg-[#057321] text-white py-3 rounded-lg font-semibold active:bg-[#046119]">Continuar</button>
            </div>
          </div>
        )}

        {/* Etapa 3 */}
        {etapa === 3 && (
          <div className="space-y-4">
            <input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Senha (min 6)" className="w-full px-4 py-3 border rounded-lg text-base" />
            <input type="password" value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)} placeholder="Confirmar Senha" className="w-full px-4 py-3 border rounded-lg text-base" />
            
            <div className="flex gap-3">
              <button onClick={() => setEtapa(2)} disabled={loading} className="flex-1 bg-gray-200 py-3 rounded-lg font-semibold active:bg-gray-300">Voltar</button>
              <button onClick={criarConta} disabled={loading} className="flex-1 bg-[#057321] text-white py-3 rounded-lg font-semibold disabled:opacity-50 active:bg-[#046119]">
                {loading ? "Criando..." : "Finalizar"}
              </button>
            </div>
          </div>
        )}

        <div className="text-center pt-2">
          <button onClick={() => router.push("/")} className="text-sm text-[#057321] font-semibold hover:underline">
            Já tem conta? Faça login
          </button>
        </div>

      </div>
    </div>
  );
}
