"use client";
import { useEffect, useState } from "react";
import { useCorrespondencias } from "@/hooks/useCorrespondencias";
import { db } from "@/app/lib/firebase";
import { doc, getDoc, Timestamp } from "firebase/firestore";
import CorrespondenciaTable, { Linha } from "@/components/CorrespondenciaTable";
// ✅ NOVO: Import do modal profissional
import ModalRetiradaProfissional from "@/components/ModalRetiradaProfissional";

export default function CorrespondenciasPage() {
  const {
    listarCorrespondencias,
    registrarRetirada,
    getPorteiroAssinaturaUrl,
    gerarSegundaVia,
    marcarComoCompartilhado, // ✅ NOVO
    loading,
  } = useCorrespondencias();
  const [dados, setDados] = useState<Linha[]>([]);
  const [tipoFiltro, setTipoFiltro] = useState<"criado" | "retirado">("criado");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");

  // ✅ NOVO: Estados para controlar o modal profissional
  const [modalAberto, setModalAberto] = useState(false);
  const [correspondenciaSelecionada, setCorrespondenciaSelecionada] = useState<any>(null);

  const carregar = async () => {
    console.time("⏱️ Tempo de carregamento");
    
    const lista = await listarCorrespondencias();
    console.log("📦 Correspondências recebidas:", lista.length);

    // ========================================
    // ✅ OTIMIZAÇÃO: Consultas Paralelas
    // ========================================
    const promessas = lista.map(async (c: any) => {
      // Se já tem os dados desnormalizados, usa eles
      if (c.moradorNome && c.blocoNome && c.apartamento) {
        return {
          id: c.id!,
          protocolo: c.protocolo,
          moradorNome: c.moradorNome,
          apartamento: c.apartamento,
          blocoNome: c.blocoNome,
          condominioId: c.condominioId,
          status: c.status,
          imagemUrl: c.imagemUrl,
          pdfUrl: c.pdfUrl,
          reciboUrl: c.reciboUrl,
          criadoEm: c.criadoEm,
          retiradoEm: c.retiradoEm,
          compartilhadoVia: c.compartilhadoVia || [], // ✅ NOVO
        };
      }

      // Se não tem, busca em paralelo (fallback para dados antigos)
      let moradorNome = "";
      let apartamento = "";
      let blocoNome = "";

      try {
        // ✅ VALIDAÇÃO: Só busca se os IDs existirem
        const promessas = [];
        
        if (c.moradorId) {
          promessas.push(getDoc(doc(db, "users", c.moradorId)));
        } else {
          promessas.push(Promise.resolve(null));
        }
        
        if (c.blocoId) {
          promessas.push(getDoc(doc(db, "blocos", c.blocoId)));
        } else {
          promessas.push(Promise.resolve(null));
        }
        
        const [mSnap, bSnap] = await Promise.all(promessas);

        if (mSnap && mSnap.exists()) {
          moradorNome = (mSnap.data()?.nome as string) || "";
          apartamento = (mSnap.data()?.apartamento as string) || "";
        }

        if (bSnap && bSnap.exists()) {
          blocoNome = (bSnap.data()?.nome as string) || "";
        }
      } catch (err) {
        console.error("❌ Erro ao buscar dados:", err);
      }

      return {
        id: c.id!,
        protocolo: c.protocolo,
        moradorNome,
        apartamento,
        blocoNome,
        condominioId: c.condominioId,
        status: c.status,
        imagemUrl: c.imagemUrl,
        pdfUrl: c.pdfUrl,
        reciboUrl: c.reciboUrl,
        criadoEm: c.criadoEm,
        retiradoEm: c.retiradoEm,
        compartilhadoVia: c.compartilhadoVia || [], // ✅ NOVO
      };
    });

    // Executa todas as promessas em paralelo
    const ricos = await Promise.all(promessas);
    
    console.timeEnd("⏱️ Tempo de carregamento");
    console.log("✅ Dados processados:", ricos.length);
    
    setDados(ricos);
  };

  useEffect(() => {
    carregar();
  }, []);

  /** filtro de datas */
  const filtrados = dados.filter((d) => {
    let dataRef: Timestamp | null = null;
   if (tipoFiltro === "criado") dataRef = d.criadoEm ?? null;
    else if (tipoFiltro === "retirado") dataRef = d.retiradoEm ?? null;

    if (!dataRef) return true;

    const dataJS = dataRef.toDate();
    const ini = dataInicio ? new Date(dataInicio) : null;
    const fim = dataFim ? new Date(dataFim) : null;
    if (ini && dataJS < ini) return false;
    if (fim && dataJS > fim) return false;
    return true;
  });

  // ✅ NOVO: Função para abrir o modal profissional
  const abrirModalRetirada = (linha: Linha) => {
    // Converte Linha para formato de correspondência
    const correspondencia = {
      id: linha.id,
      protocolo: linha.protocolo,
      moradorNome: linha.moradorNome,
      apartamento: linha.apartamento,
      blocoNome: linha.blocoNome,
      condominioId: linha.condominioId,
      status: linha.status,
      imagemUrl: linha.imagemUrl,
      pdfUrl: linha.pdfUrl,
      reciboUrl: linha.reciboUrl,
      criadoEm: linha.criadoEm,
      retiradoEm: linha.retiradoEm,
    };

    setCorrespondenciaSelecionada(correspondencia);
    setModalAberto(true);
  };

  const onRetirar = async (
    linha: Linha,
    moradorAssDataUrl: string,
    porteiroAssDataUrl?: string,
    salvarPadrao?: boolean
  ) => {
    let condominioNome = "";
    try {
      const c = await getDoc(doc(db, "condominios", linha.condominioId));
      condominioNome = (c.data()?.nome as string) || "";
    } catch {}

    const res = await registrarRetirada(
      {
        id: linha.id,
        condominioId: linha.condominioId,
        protocolo: linha.protocolo,
        condominioNome,
        blocoNome: linha.blocoNome ?? '',
        moradorNome: linha.moradorNome ?? '',
        apartamento: linha.apartamento ?? '',
      },
      {
        moradorDataUrl: moradorAssDataUrl,
        porteiroDataUrl: porteiroAssDataUrl,
        salvarPorteiroComoPadrao: salvarPadrao,
      }
    );

    if (res) {
      setDados((ant) =>
        ant.map((x) =>
          x.id === linha.id
            ? { ...x, status: "retirada", reciboUrl: res.reciboUrl, retiradoEm: Timestamp.now() }
            : x
        )
      );
    }
    return res;
  };

  const onSegundaVia = async (linha: Linha) => {
    const tipo = linha.status === "pendente" ? "aviso" : "recibo";
    const res = await gerarSegundaVia(linha.id, tipo);
    if (res) {
      alert(`Segunda via gerada com sucesso!`);
      carregar();
    }
  };

  // ✅ NOVO: Callback de sucesso do modal profissional
  const handleRetiradaSuccess = () => {
    setModalAberto(false);
    setCorrespondenciaSelecionada(null);
    carregar(); // Recarrega a lista
  };

  return (
    <main className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Correspondências</h1>

      {/* Filtros de data */}
      <div className="bg-white border rounded p-4 flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por</label>
          <select
            value={tipoFiltro}
            onChange={(e) => setTipoFiltro(e.target.value as any)}
            className="border rounded px-3 py-2"
          >
            <option value="criado">Criadas</option>
            <option value="retirado">Retiradas</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">De</label>
          <input
            type="date"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Até</label>
          <input
            type="date"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
        <button
          onClick={carregar}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded transition"
        >
          Atualizar
        </button>
      </div>

      {/* tabela */}
      <CorrespondenciaTable
        dados={filtrados}
        onRetirar={onRetirar}
        carregando={loading}
        getPorteiroAssinaturaUrl={() => getPorteiroAssinaturaUrl((null as any))}
        onCompartilhar={async (id, via, pdfUrl, protocolo, moradorNome) => {
          // Marca como compartilhado no Firestore
          const sucesso = await marcarComoCompartilhado(id, via);
          if (sucesso) {
            // Atualiza a lista localmente
            setDados((ant) =>
              ant.map((x) =>
                x.id === id
                  ? {
                      ...x,
                      compartilhadoVia: [
                        ...(x.compartilhadoVia || []),
                        via,
                      ].filter((v, i, arr) => arr.indexOf(v) === i), // Remove duplicatas
                    }
                  : x
              )
            );
          }
        }}
        // ✅ NOVO: Passa a função para abrir o modal profissional
        onAbrirModalRetirada={abrirModalRetirada}
      />

      {/* ✅ NOVO: Modal profissional de retirada */}
      {modalAberto && correspondenciaSelecionada && (
        <ModalRetiradaProfissional
          correspondencia={correspondenciaSelecionada}
          onClose={() => {
            setModalAberto(false);
            setCorrespondenciaSelecionada(null);
          }}
          onSuccess={handleRetiradaSuccess}
        />
      )}
    </main>
  );
}