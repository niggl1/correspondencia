"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  LogOut,
  User,
  Building2,
  Home,
  Users,
  Plus,
  List,
  FileText,
  Zap,
  FileBarChart,
  Clock,
  AlertTriangle,
  LayoutTemplate, 
  Columns,      
  ListVideo,
  UserCog,
  CheckSquare,
  Download,
  Link as LinkIcon,
  MessageSquare,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import GerarFolder from "@/components/GerarFolder";
import { db } from "@/app/lib/firebase";
import { useAuth } from "@/hooks/useAuth";
import { collection, query, where, getCountFromServer } from "firebase/firestore";
import withAuth from "@/components/withAuth";

function DashboardResponsavel() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [layoutMode, setLayoutMode] = useState<'original' | 'colunas' | 'linha'>('original');
  const [isMounted, setIsMounted] = useState(false);
  
  // Estado para controlar a visibilidade da barra de cadastros
  const [isCadastrosOpen, setIsCadastrosOpen] = useState(false);

  const [stats, setStats] = useState({
    blocos: 0,
    unidades: 0,
    moradores: 0,
    pendentes: 0,
  });

  const [showInfo, setShowInfo] = useState(true);

  useEffect(() => {
    const savedLayout = localStorage.getItem("layout_pref_responsavel");
    if (savedLayout === 'original' || savedLayout === 'colunas' || savedLayout === 'linha') {
      setLayoutMode(savedLayout);
    }
    setIsMounted(true);

    if (user?.condominioId) carregarEstatisticas();
  }, [user]);

  const changeLayout = (mode: 'original' | 'colunas' | 'linha') => {
    setLayoutMode(mode);
    localStorage.setItem("layout_pref_responsavel", mode);
  };

  const toggleCadastros = () => {
    setIsCadastrosOpen(!isCadastrosOpen);
  };

  const carregarEstatisticas = async () => {
    if (!user?.condominioId) return;
    try {
      const blocosSnap = await getCountFromServer(
        query(collection(db, "blocos"), where("condominioId", "==", user.condominioId))
      );
      const moradoresSnap = await getCountFromServer(
        query(collection(db, "users"), where("condominioId", "==", user.condominioId), where("role", "==", "morador"))
      );
      const pendentesSnap = await getCountFromServer(
        query(collection(db, "users"), where("condominioId", "==", user.condominioId), where("role", "==", "morador"), where("aprovado", "==", false))
      );

      setStats({
        blocos: blocosSnap.data().count,
        unidades: 0,
        moradores: moradoresSnap.data().count,
        pendentes: pendentesSnap.data().count,
      });
    } catch (error) {
      console.error(error);
    }
  };

  const copiarLinkCadastro = () => {
    const baseUrl = window.location.origin;
    const link = `${baseUrl}/cadastro-morador`;
    
    navigator.clipboard.writeText(link).then(() => {
      alert("Link de cadastro copiado! Envie para os moradores.");
    }).catch(() => {
      alert("Erro ao copiar link. Tente manualmente: " + link);
    });
  };

  const getRoleLabel = (role: string) => {
    const r: any = { responsavel: "Responsável", admin: "Admin", adminMaster: "Admin Master" };
    return r[role] || role;
  };

  if (!isMounted) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-green-50/30">
      <header className="bg-gradient-to-r from-[#057321] to-[#046119] shadow-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Image src="/logo-app-correspondencia.png" alt="Logo" width={45} height={45} className="rounded-lg border border-gray-200 object-cover" />
              <div className="hidden sm:block">
                <h1 className="text-lg font-bold text-white">App Correspondência</h1>
                <p className="text-sm text-green-100">Painel do Responsável</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {user && (
                <button onClick={() => router.push("/minha-conta")} className="flex items-center gap-2 px-3 py-2 text-white hover:bg-white/20 rounded-lg transition-all">
                  <User size={22} className="text-white" />
                  <div className="hidden sm:block text-left">
                    <span className="block text-xs font-semibold text-green-100">{getRoleLabel(user.role)}</span>
                    <span className="block text-sm font-bold text-white">{user.nome?.split(" ")[0]}</span>
                  </div>
                </button>
              )}
              
              <button onClick={logout} className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all shadow-sm">
                <LogOut size={20} />
                <span className="hidden sm:inline font-medium">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-12">
        
        {/* Seletor de Layout e Stats */}
        <div className="flex flex-col xl:flex-row items-center justify-between gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="text-center sm:text-left">
                <h1 className="text-2xl font-bold text-gray-900">👋 Bem-vindo, {user?.nome?.split(" ")[0]}!</h1>
                <p className="text-gray-500 text-sm">Personalize a visualização do painel:</p>
            </div>

            {/* STATS (Blocos, Moradores, Pendentes) - ESTILO ATUALIZADO */}
            <div className="flex flex-wrap justify-center gap-4 px-4 border-l border-r border-gray-100 mx-4">
                
                {/* Blocos */}
                <div className="group flex items-center gap-3 px-4 py-2 bg-[#057321] rounded-lg border border-[#057321] hover:bg-white transition-all duration-300 shadow-sm cursor-default">
                    <Building2 size={20} className="text-white group-hover:text-[#057321] transition-colors" />
                    <div className="text-left">
                        <span className="block text-[10px] font-bold uppercase text-green-100 group-hover:text-green-700 transition-colors">Blocos</span>
                        <span className="block text-xl font-black text-white group-hover:text-[#057321] leading-none transition-colors">{stats.blocos}</span>
                    </div>
                </div>

                {/* Moradores */}
                <div className="group flex items-center gap-3 px-4 py-2 bg-[#057321] rounded-lg border border-[#057321] hover:bg-white transition-all duration-300 shadow-sm cursor-default">
                    <Users size={20} className="text-white group-hover:text-[#057321] transition-colors" />
                    <div className="text-left">
                        <span className="block text-[10px] font-bold uppercase text-green-100 group-hover:text-green-700 transition-colors">Moradores</span>
                        <span className="block text-xl font-black text-white group-hover:text-[#057321] leading-none transition-colors">{stats.moradores}</span>
                    </div>
                </div>

                {/* Pendentes */}
                <div className="group flex items-center gap-3 px-4 py-2 bg-[#057321] rounded-lg border border-[#057321] hover:bg-white transition-all duration-300 shadow-sm cursor-default">
                    <CheckSquare size={20} className="text-white group-hover:text-[#057321] transition-colors" />
                    <div className="text-left">
                        <span className="block text-[10px] font-bold uppercase text-green-100 group-hover:text-green-700 transition-colors">Pendentes</span>
                        <span className="block text-xl font-black text-white group-hover:text-[#057321] leading-none transition-colors">{stats.pendentes}</span>
                    </div>
                </div>

            </div>

            {/* Botões de Layout */}
            <div className="flex bg-gray-100 rounded-lg p-1 shadow-inner">
                <button 
                onClick={() => changeLayout('original')} 
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-medium ${layoutMode === 'original' ? 'bg-white text-[#057321] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                <LayoutTemplate size={18} /> Padrão
                </button>
                <button 
                onClick={() => changeLayout('colunas')} 
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-medium ${layoutMode === 'colunas' ? 'bg-white text-[#057321] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                <Columns size={18} /> Colunas
                </button>
                <button 
                onClick={() => changeLayout('linha')} 
                className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all text-sm font-medium ${layoutMode === 'linha' ? 'bg-white text-[#057321] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                <ListVideo size={18} /> Linha
                </button>
            </div>
        </div>

        {/* AVISO */}
        {showInfo && (
          <div className="relative mb-8 bg-white border border-[#057321] rounded-xl py-2 px-4 flex items-center justify-center shadow-sm">
            <button 
              onClick={() => setShowInfo(false)} 
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
            >
              ✕
            </button>

            <div className="flex flex-col sm:flex-row items-center gap-2 text-center w-full justify-center">
              <div className="flex items-center gap-2 text-[#057321]">
                <div className="bg-green-50 p-1 rounded-full">
                    <AlertTriangle size={16} />
                </div>
                <h2 className="text-sm font-bold uppercase tracking-wide">Envio inteligente:</h2>
              </div>
              <p className="text-red-600 font-medium text-xs sm:text-sm leading-tight">
                O sistema busca o WhatsApp do morador e envia Link + PDF + E-mail automaticamente.
              </p>
            </div>
          </div>
        )}

        {/* ===================================================================================== */}
        {/* LAYOUT 1: ORIGINAL */}
        {/* ===================================================================================== */}
        {layoutMode === 'original' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                <button onClick={() => router.push("/dashboard-responsavel/nova-correspondencia")} className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-[#057321] to-[#046119] text-white rounded-xl hover:from-[#046119] hover:to-[#035218] transition-all font-bold shadow-md hover:shadow-lg text-lg h-24">
                    <Plus size={24} /> <span className="text-center leading-tight">Aviso de<br />Correspondência</span>
                </button>
                <button onClick={() => router.push("/dashboard-responsavel/avisos-rapidos")} className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-[#057321] to-[#046119] text-white rounded-xl hover:from-[#046119] hover:to-[#035218] transition-all font-bold shadow-md hover:shadow-lg text-lg h-24">
                    <Zap size={24} /> Avisos Rápidos
                </button>
                <button onClick={() => router.push("/dashboard-responsavel/registrar-retirada")} className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-[#057321] to-[#046119] text-white rounded-xl hover:from-[#046119] hover:to-[#035218] transition-all font-bold shadow-md hover:shadow-lg text-lg h-24">
                    <FileText size={24} /> Registrar Retirada
                </button>
                <button onClick={() => router.push("/dashboard-responsavel/correspondencias")} className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-[#057321] to-[#046119] text-white rounded-xl hover:from-[#046119] hover:to-[#035218] transition-all font-bold shadow-md hover:shadow-lg text-lg h-24">
                    <List size={24} /> Avisos Enviados
                </button>
                <button onClick={() => router.push("/dashboard-responsavel/historico")} className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-[#057321] to-[#046119] text-white rounded-xl hover:from-[#046119] hover:to-[#035218] transition-all font-bold shadow-md hover:shadow-lg text-lg h-24">
                    <Clock size={24} /> Histórico de Recibos
                </button>
                <button onClick={() => router.push("/dashboard-responsavel/relatorios")} className="flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-[#057321] to-[#046119] text-white rounded-xl hover:from-[#046119] hover:to-[#035218] transition-all font-bold shadow-md hover:shadow-lg text-lg h-24">
                    <FileBarChart size={24} /> Relatórios
                </button>
            </div>
        )}

        {/* ===================================================================================== */}
        {/* LAYOUT 2: COLUNAS (2 COLUNAS) */}
        {/* ===================================================================================== */}
        {layoutMode === 'colunas' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8 items-start">
                
                {/* --- COLUNA 1: AVISOS --- */}
                <div className="bg-green-50 rounded-xl border-2 border-[#057321] overflow-hidden flex flex-col shadow-sm h-full">
                        <div className="bg-[#057321] p-2 text-center">
                            <h3 className="text-xs font-bold text-white uppercase tracking-wider">AVISOS</h3>
                        </div>
                        <div className="p-4 flex flex-col gap-4 h-full">
                        
                        <button onClick={() => router.push("/dashboard-responsavel/nova-correspondencia")} className="w-full flex flex-col items-center justify-center gap-1 p-4 bg-gradient-to-r from-[#057321] to-[#046119] text-white rounded-xl shadow-md active:scale-[0.98] transition-all h-24 hover:scale-[1.02]">
                            <div><Plus size={32} /></div>
                            <span className="text-sm font-bold text-center uppercase">AVISOS</span>
                        </button>

                        <button onClick={() => router.push("/dashboard-responsavel/registrar-retirada")} className="w-full flex flex-col items-center justify-center gap-1 p-4 bg-gradient-to-r from-[#057321] to-[#046119] text-white rounded-xl shadow-md active:scale-[0.98] transition-all h-24 hover:scale-[1.02]">
                            <div><FileText size={32} /></div>
                            <span className="text-sm font-bold text-center uppercase">RETIRADA</span>
                        </button>

                        <button onClick={() => router.push("/dashboard-responsavel/avisos-rapidos")} className="w-full flex flex-col items-center justify-center gap-1 p-4 bg-gradient-to-r from-[#057321] to-[#046119] text-white rounded-xl shadow-md active:scale-[0.98] transition-all h-24 hover:scale-[1.02]">
                            <div><Zap size={32} /></div>
                            <span className="text-sm font-bold text-center uppercase">RÁPIDO</span>
                        </button>
                        </div>
                </div>

                {/* --- COLUNA 2: CONSULTAS --- */}
                <div className="bg-green-50 rounded-xl border-2 border-[#057321] overflow-hidden flex flex-col shadow-sm h-full">
                        <div className="bg-[#057321] p-2 text-center">
                            <h3 className="text-xs font-bold text-white uppercase tracking-wider">CONSULTAS</h3>
                        </div>
                        <div className="p-4 flex flex-col gap-4 h-full">
                            
                            <button onClick={() => router.push("/dashboard-responsavel/correspondencias")} className="w-full flex flex-col items-center justify-center gap-1 p-4 bg-gradient-to-r from-[#057321] to-[#046119] text-white rounded-xl shadow-md active:scale-[0.98] transition-all h-24 hover:scale-[1.02]">
                                <div><List size={32} /></div>
                                <span className="text-sm font-bold text-center uppercase">ENVIADOS</span>
                            </button>

                            <button onClick={() => router.push("/dashboard-responsavel/historico")} className="w-full flex flex-col items-center justify-center gap-1 p-4 bg-gradient-to-r from-[#057321] to-[#046119] text-white rounded-xl shadow-md active:scale-[0.98] transition-all h-24 hover:scale-[1.02]">
                                <div><Clock size={32} /></div>
                                <span className="text-sm font-bold text-center uppercase">HISTÓRICO</span>
                            </button>

                            <button onClick={() => router.push("/dashboard-responsavel/relatorios")} className="w-full flex flex-col items-center justify-center gap-1 p-4 bg-gradient-to-r from-[#057321] to-[#046119] text-white rounded-xl shadow-md active:scale-[0.98] transition-all h-24 hover:scale-[1.02]">
                                <div><FileBarChart size={32} /></div>
                                <span className="text-sm font-bold text-center uppercase">RELATÓRIOS</span>
                            </button>
                        </div>
                </div>
            </div>
        )}

        {/* ===================================================================================== */}
        {/* LAYOUT 3: LINHA ÚNICA */}
        {/* ===================================================================================== */}
        {layoutMode === 'linha' && (
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3 mb-8">
                <button onClick={() => router.push("/dashboard-responsavel/nova-correspondencia")} className="aspect-square flex flex-col items-center justify-center gap-2 p-2 bg-gradient-to-r from-[#057321] to-[#046119] text-white rounded-2xl hover:from-[#046119] hover:to-[#035218] transition-all font-bold shadow-md">
                    <Plus size={32} /> <span className="text-center text-xs leading-tight">Nova<br />Entrega</span>
                </button>
                <button onClick={() => router.push("/dashboard-responsavel/avisos-rapidos")} className="aspect-square flex flex-col items-center justify-center gap-2 p-2 bg-gradient-to-r from-[#057321] to-[#046119] text-white rounded-2xl hover:from-[#046119] hover:to-[#035218] transition-all font-bold shadow-md">
                    <Zap size={32} /> <span className="text-center text-xs">Avisos<br/>Rápidos</span>
                </button>
                <button onClick={() => router.push("/dashboard-responsavel/registrar-retirada")} className="aspect-square flex flex-col items-center justify-center gap-2 p-2 bg-gradient-to-r from-[#057321] to-[#046119] text-white rounded-2xl hover:from-[#046119] hover:to-[#035218] transition-all font-bold shadow-md">
                    <FileText size={32} /> <span className="text-center text-xs">Registrar<br/>Retirada</span>
                </button>
                <button onClick={() => router.push("/dashboard-responsavel/correspondencias")} className="aspect-square flex flex-col items-center justify-center gap-2 p-2 bg-gradient-to-r from-[#057321] to-[#046119] text-white rounded-2xl hover:from-[#046119] hover:to-[#035218] transition-all font-bold shadow-md">
                    <List size={32} /> <span className="text-center text-xs">Avisos<br/>Enviados</span>
                </button>
                <button onClick={() => router.push("/dashboard-responsavel/historico")} className="aspect-square flex flex-col items-center justify-center gap-2 p-2 bg-gradient-to-r from-[#057321] to-[#046119] text-white rounded-2xl hover:from-[#046119] hover:to-[#035218] transition-all font-bold shadow-md">
                    <Clock size={32} /> <span className="text-center text-xs">Histórico<br/>Recibos</span>
                </button>
                <button onClick={() => router.push("/dashboard-responsavel/relatorios")} className="aspect-square flex flex-col items-center justify-center gap-2 p-2 bg-gradient-to-r from-[#057321] to-[#046119] text-white rounded-2xl hover:from-[#046119] hover:to-[#035218] transition-all font-bold shadow-md">
                    <FileBarChart size={32} /> <span className="text-center text-xs">Relatórios<br/>Gerais</span>
                </button>
            </div>
        )}

        {/* ===================================================================================== */}
        {/* BARRA UNIFICADA COM TOGGLE: CADASTROS E CONFIGURAÇÕES */}
        {/* ===================================================================================== */}
        <div className="rounded-2xl border border-green-100 overflow-hidden mb-8 shadow-sm bg-white transition-all duration-300">
            {/* Header da Barra - Clicável para abrir/fechar */}
            <div 
                onClick={toggleCadastros}
                className="bg-[#057321] px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-[#046119] transition-colors select-none"
            >
                <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                    <Users size={18} className="text-white" /> Gestão de Cadastros e Configurações
                </h3>
                {isCadastrosOpen ? (
                    <ChevronUp size={20} className="text-white" />
                ) : (
                    <ChevronDown size={20} className="text-white" />
                )}
            </div>
            
            {/* Grid de Itens - Renderização Condicional */}
            {isCadastrosOpen && (
                <div className="grid grid-cols-2 md:grid-cols-7 gap-3 p-4 sm:p-6 animate-in slide-in-from-top-2 duration-300">
                    {/* 1. Blocos */}
                    <div onClick={() => router.push("/dashboard-responsavel/blocos")} className="group flex flex-col items-center justify-center gap-2 p-3 bg-white border border-gray-100 rounded-xl hover:bg-[#057321] cursor-pointer transition-all shadow-sm">
                        <Building2 size={28} className="text-[#057321] group-hover:text-white transition-colors" />
                        <span className="font-bold text-gray-700 text-sm group-hover:text-white transition-colors">Blocos</span>
                        <span className="text-[10px] text-gray-400 group-hover:text-green-200 transition-colors">Gerenciar</span>
                    </div>

                    {/* 2. Moradores */}
                    <div onClick={() => router.push("/dashboard-responsavel/moradores")} className="group flex flex-col items-center justify-center gap-2 p-3 bg-white border border-gray-100 rounded-xl hover:bg-[#057321] cursor-pointer transition-all shadow-sm">
                        <Home size={28} className="text-[#057321] group-hover:text-white transition-colors" />
                        <span className="font-bold text-gray-700 text-sm group-hover:text-white transition-colors">Moradores</span>
                        <span className="text-[10px] text-gray-400 group-hover:text-green-200 transition-colors">Gerenciar</span>
                    </div>

                    {/* 3. Porteiros */}
                    <div onClick={() => router.push("/dashboard-responsavel/porteiros")} className="group flex flex-col items-center justify-center gap-2 p-3 bg-white border border-gray-100 rounded-xl hover:bg-[#057321] cursor-pointer transition-all shadow-sm">
                        <UserCog size={28} className="text-[#057321] group-hover:text-white transition-colors" />
                        <span className="font-bold text-gray-700 text-sm group-hover:text-white transition-colors">Porteiros</span>
                        <span className="text-[10px] text-gray-400 group-hover:text-green-200 transition-colors">Gerenciar</span>
                    </div>

                    {/* 4. Aprovações */}
                    <div onClick={() => router.push("/dashboard-responsavel/aprovacoes")} className="group flex flex-col items-center justify-center gap-2 p-3 bg-white border border-gray-100 rounded-xl hover:bg-[#057321] cursor-pointer transition-all shadow-sm">
                        <CheckSquare size={28} className="text-[#057321] group-hover:text-white transition-colors" />
                        <span className="font-bold text-gray-700 text-sm group-hover:text-white transition-colors">Aprovar</span>
                        <span className="text-[10px] text-gray-400 group-hover:text-green-200 transition-colors">Pendentes</span>
                    </div>
                    
                    {/* 5. Mensagens */}
                    <div onClick={() => router.push("/dashboard-responsavel/configuracao-mensagens")} className="group flex flex-col items-center justify-center gap-2 p-3 bg-white border border-gray-100 rounded-xl hover:bg-[#057321] cursor-pointer transition-all shadow-sm">
                        <MessageSquare size={28} className="text-[#057321] group-hover:text-white transition-colors" />
                        <span className="font-bold text-gray-700 text-sm group-hover:text-white transition-colors">Mensagens</span>
                        <span className="text-[10px] text-gray-400 group-hover:text-green-200 transition-colors">Configurar</span>
                    </div>

                    {/* 6. Copiar Link */}
                    <div onClick={copiarLinkCadastro} className="group flex flex-col items-center justify-center gap-2 p-3 bg-white border border-gray-100 rounded-xl hover:bg-[#057321] cursor-pointer transition-all shadow-sm">
                        <LinkIcon size={28} className="text-[#057321] group-hover:text-white transition-colors" />
                        <span className="font-bold text-gray-700 text-sm group-hover:text-white transition-colors">Copiar Link</span>
                        <span className="text-[10px] text-gray-400 group-hover:text-green-200 transition-colors">Divulgar</span>
                    </div>

                    {/* 7. Gerar Folder */}
                    <div className="group flex flex-col items-center justify-center gap-2 p-3 bg-white border border-gray-100 rounded-xl hover:bg-[#057321] cursor-pointer transition-all shadow-sm relative overflow-hidden">
                        {/* Visual do Card */}
                        <Download size={28} className="text-[#057321] group-hover:text-white transition-colors" />
                        <span className="font-bold text-gray-700 text-sm group-hover:text-white transition-colors">Impressão</span>
                        <span className="text-[10px] text-gray-400 group-hover:text-green-200 transition-colors">Cartaz</span>
                        
                        {/* Componente Funcional Invisível sobreposto */}
                        <div className="absolute inset-0 opacity-0 z-10 flex items-center justify-center">
                            <GerarFolder condominioId={user?.condominioId || ""} condominioNome={user?.nome || ""} condominioEndereco="" responsavelNome={user?.nome} />
                        </div>
                    </div>
                </div>
            )}
        </div>

      </main>
    </div>
  );
}

export default withAuth(DashboardResponsavel, ["responsavel", "admin", "adminMaster"]);