"use client";
import { useEffect, useMemo, useState } from "react";
import AssinaturaModal from "./AssinaturaModal";
import { Timestamp } from "firebase/firestore";
import { MessageCircle, Mail, FileText, CheckCircle } from "lucide-react";

export interface Linha {
  id: string;
  protocolo: string;
  moradorNome?: string;
  apartamento?: string;
  blocoNome?: string;
  condominioId: string;
  status: "pendente" | "retirada";
  imagemUrl?: string;
  pdfUrl?: string;
  reciboUrl?: string;
  criadoEm?: Timestamp;
  retiradoEm?: Timestamp;
  compartilhadoVia?: string[];
}

interface Props {
  dados: Linha[];
  onRetirar: (linha: Linha, moradorAssDataUrl: string, porteiroAssDataUrl?: string, salvarPadrao?: boolean) => Promise<{
    reciboUrl: string;
    whatsLink: string;
    mailtoLink: string;
  } | null>;
  carregando?: boolean;
  getPorteiroAssinaturaUrl: () => Promise<string | null>;
  onCompartilhar?: (id: string, via: "whatsapp" | "email", pdfUrl: string, protocolo: string, moradorNome: string) => Promise<void>;
  onAbrirModalRetirada?: (linha: Linha) => void;
}

export default function CorrespondenciaTable({ 
  dados, 
  onRetirar, 
  carregando, 
  getPorteiroAssinaturaUrl,
  onCompartilhar,
  onAbrirModalRetirada,
}: Props) {
  const [filtroStatus, setFiltroStatus] = useState<"" | "pendente" | "retirada">("");
  const [busca, setBusca] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [linhaSelecionada, setLinhaSelecionada] = useState<Linha | null>(null);
  const [porteiroAssUrl, setPorteiroAssUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const url = await getPorteiroAssinaturaUrl();
      setPorteiroAssUrl(url);
    })();
  }, [getPorteiroAssinaturaUrl]);

  const lista = useMemo(() => {
    return dados.filter((d) => {
      if (filtroStatus && d.status !== filtroStatus) return false;
      if (busca) {
        const alvo = `${d.protocolo} ${d.moradorNome || ""} ${d.apartamento || ""} ${d.blocoNome || ""}`.toLowerCase();
        if (!alvo.includes(busca.toLowerCase())) return false;
      }
      return true;
    });
  }, [dados, filtroStatus, busca]);

  const handleWhatsApp = async (linha: Linha) => {
    if (!linha.pdfUrl) {
      alert("PDF não disponível. Gere o PDF primeiro.");
      return;
    }

    const mensagem = `Olá ${linha.moradorNome}! Você tem uma correspondência aguardando retirada.\n\nProtocolo: #${linha.protocolo}\n\nVeja o comprovante: ${linha.pdfUrl}`;
    const whatsLink = `https://wa.me/?text=${encodeURIComponent(mensagem)}`;
    window.open(whatsLink, "_blank");

    if (onCompartilhar) {
      await onCompartilhar(linha.id, "whatsapp", linha.pdfUrl, linha.protocolo, linha.moradorNome || "");
    }
  };

  const handleEmail = async (linha: Linha) => {
    if (!linha.pdfUrl) {
      alert("PDF não disponível. Gere o PDF primeiro.");
      return;
    }

    const mensagem = `Olá ${linha.moradorNome}! Você tem uma correspondência aguardando retirada.\n\nProtocolo: #${linha.protocolo}\n\nVeja o comprovante: ${linha.pdfUrl}`;
    const mailtoLink = `mailto:?subject=Nova Correspondência - Protocolo ${linha.protocolo}&body=${encodeURIComponent(mensagem)}`;
    window.open(mailtoLink);

    if (onCompartilhar) {
      await onCompartilhar(linha.id, "email", linha.pdfUrl, linha.protocolo, linha.moradorNome || "");
    }
  };

  return (
    <div className="space-y-3">
      {/* filtros */}
      <div className="flex flex-wrap gap-3 items-center">
        <input
          placeholder="Buscar por nome, protocolo, apto..."
          className="border rounded px-3 py-2"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <select
          className="border rounded px-3 py-2"
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value as any)}
        >
          <option value="">Todos</option>
          <option value="pendente">Pendentes</option>
          <option value="retirada">Retiradas</option>
        </select>
      </div>

      <div className="overflow-auto border rounded">
        <table className="min-w-[900px] w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-2">Foto</th>
              <th className="text-left p-2">Protocolo</th>
              <th className="text-left p-2">Morador</th>
              <th className="text-left p-2">Bloco / Apto</th>
              <th className="text-left p-2">Status</th>
              <th className="text-left p-2">Ações</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((l) => {
              const foiCompartilhado = l.compartilhadoVia && l.compartilhadoVia.length > 0;
              
              return (
                <tr 
                  key={l.id} 
                  className={`border-t ${foiCompartilhado ? "bg-red-50" : ""}`}
                >
                  <td className="p-2">
                    {l.imagemUrl ? (
                      <img src={l.imagemUrl} alt="" className="w-16 h-16 object-cover rounded border" />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded border" />
                    )}
                  </td>
                  <td className="p-2">
                    <div className="font-semibold">{l.protocolo}</div>
                    {foiCompartilhado && (
                      <div className="text-xs text-red-600 mt-1">
                        📤 Enviado via: {l.compartilhadoVia?.join(", ")}
                      </div>
                    )}
                  </td>
                  <td className="p-2">{l.moradorNome || "-"}</td>
                  <td className="p-2">{l.blocoNome || "-"} / {l.apartamento || "-"}</td>
                  <td className="p-2">
                    {l.status === "pendente" ? (
                      <span className="px-2 py-1 rounded bg-yellow-100 text-yellow-800 text-xs">Pendente</span>
                    ) : (
                      <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs">Retirada</span>
                    )}
                  </td>
                  <td className="p-2">
                    <div className="flex flex-wrap gap-2">
                      {/* Botão WhatsApp - Verde com ícone branco */}
                      {l.pdfUrl && (
                        <button
                          onClick={() => handleWhatsApp(l)}
                          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all font-medium shadow-sm"
                          title="Compartilhar via WhatsApp"
                        >
                          <MessageCircle size={18} />
                          WhatsApp
                        </button>
                      )}
                      
                      {/* Botão Email - Azul com ícone branco */}
                      {l.pdfUrl && (
                        <button
                          onClick={() => handleEmail(l)}
                          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-medium shadow-sm"
                          title="Compartilhar via Email"
                        >
                          <Mail size={18} />
                          Email
                        </button>
                      )}
                      
                      {/* Botão PDF - Vermelho com ícone branco */}
                      {l.pdfUrl && (
                        <a 
                          href={l.pdfUrl} 
                          target="_blank" 
                          className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all font-medium shadow-sm" 
                          rel="noreferrer"
                        >
                          <FileText size={18} />
                          PDF
                        </a>
                      )}
                      
                      {/* Botão Retirada - Verde com ícone branco */}
                      {l.status === "pendente" && onAbrirModalRetirada && (
                        <button
                          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-all font-medium shadow-sm"
                          onClick={() => onAbrirModalRetirada(l)}
                          title="Registrar retirada"
                        >
                          <CheckCircle size={18} />
                          Retirada
                        </button>
                      )}
                      
                      {/* Botão Recibo PDF - Vermelho (após retirada) */}
                      {l.status === "retirada" && l.reciboUrl && (
                        <a 
                          href={l.reciboUrl} 
                          target="_blank" 
                          className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all font-medium shadow-sm" 
                          rel="noreferrer"
                        >
                          <FileText size={18} />
                          Recibo
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}

            {!lista.length && (
              <tr>
                <td className="p-6 text-center text-gray-500" colSpan={6}>
                  {carregando ? "Carregando..." : "Nada encontrado."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AssinaturaModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        porteiroAssinaturaUrl={porteiroAssUrl || undefined}
        onConfirm={async (moradorData, porteiroData, salvarPadrao) => {
          if (!linhaSelecionada) return;
          const res = await onRetirar(linhaSelecionada, moradorData, porteiroData, salvarPadrao);
          setModalOpen(false);
          if (res?.reciboUrl) {
            window.alert("Retirada concluída com sucesso!");
          }
        }}
      />
    </div>
  );
}