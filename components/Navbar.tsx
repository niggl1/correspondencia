"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogOut, Menu, User, X } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/app/lib/firebase";
import { useAuth } from "@/hooks/useAuth";

export default function NavbarSimples() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/"); // ✅ AJUSTADO: Redireciona para a raiz (sua nova tela de login)
  };

  // Tradução dos roles
  const getRoleLabel = (role: string) => {
    const roles: { [key: string]: string } = {
      porteiro: "Porteiro",
      responsavel: "Responsável",
      morador: "Morador",
      admin: "Admin",
      adminMaster: "Admin Master",
    };
    return roles[role] || role;
  };

  return (
    // Apliquei o gradiente verde e removi a borda e o fundo branco antigo
    <nav className="fixed top-0 left-0 right-0 bg-gradient-to-r from-[#057321] to-[#046119] shadow-md z-50 h-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-full">
        <div className="flex justify-between items-center h-full">
          
          {/* ESQUERDA: Logo + Nome */}
          <div className="flex items-center gap-3 overflow-hidden cursor-pointer" onClick={() => router.push("/")}>
            <div className="shrink-0 bg-white/10 p-1 rounded-lg">
              <Image
                src="/logo-app-correspondencia.png"
                alt="Logo"
                width={40}
                height={40}
                className="object-contain w-8 h-8 sm:w-9 sm:h-9"
              />
            </div>
            <div className="flex flex-col">
                <span className="font-bold text-white text-sm sm:text-lg leading-tight whitespace-nowrap">
                App Correspondência
                </span>
                {/* Mostra o cargo abaixo do logo também no mobile se quiser, ou esconde */}
                {user && (
                    <span className="text-[10px] text-green-100 sm:hidden leading-tight">
                        {getRoleLabel(user.role)}
                    </span>
                )}
            </div>
          </div>

          {/* DIREITA: Desktop (Hidden no mobile) */}
          <div className="hidden md:flex items-center space-x-4">
            {user && (
              <Link
                href="/minha-conta"
                className="flex items-center gap-3 px-3 py-1.5 rounded-lg hover:bg-white/10 transition group"
              >
                <div className="bg-white/20 p-1.5 rounded-full group-hover:bg-white/30 transition">
                    <User size={20} className="text-white" />
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-medium text-green-100 leading-none mb-0.5">
                    {getRoleLabel(user.role)}
                  </span>
                  <span className="font-bold text-white text-sm leading-none max-w-[150px] truncate">
                    {user.nome?.split(' ')[0] || "Usuário"}
                  </span>
                </div>
              </Link>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition shadow-sm"
            >
              <LogOut size={18} /> Sair
            </button>
          </div>

          {/* DIREITA: Botão Mobile (Hamburger) */}
          <div className="md:hidden flex items-center">
            <button 
              onClick={() => setOpen(!open)} 
              className="p-2 rounded-lg hover:bg-white/10 text-white focus:outline-none transition"
            >
              {open ? <X size={28} /> : <Menu size={28} />}
            </button>
          </div>
        </div>
      </div>

      {/* MENU MOBILE (Dropdown) */}
      {open && (
        <div className="md:hidden absolute top-16 left-0 right-0 bg-white border-b shadow-lg animate-fade-in z-40">
          <div className="flex flex-col p-4 space-y-3">
            {user && (
              <Link
                href="/minha-conta"
                onClick={() => setOpen(false)}
                className="flex flex-col gap-1 p-3 rounded-lg bg-gray-50 border border-gray-100 hover:bg-gray-100 transition"
              >
                <div className="flex items-center gap-3 mb-1">
                  <div className="bg-green-600 p-1.5 rounded-full shadow-sm text-white">
                    <User size={20} />
                  </div>
                  <span className="font-bold text-gray-800 text-base break-words">
                    {user.nome || "Usuário"}
                  </span>
                </div>
                <span className="text-sm text-gray-500 ml-1">
                  Perfil: <span className="text-[#057321] font-bold">{getRoleLabel(user.role)}</span>
                </span>
              </Link>
            )}

            <button
              onClick={() => {
                setOpen(false);
                handleLogout();
              }}
              className="flex items-center justify-center gap-2 w-full py-3 rounded-lg bg-red-50 text-red-600 font-medium hover:bg-red-100 transition border border-red-100"
            >
              <LogOut size={18} /> 
              Sair do Sistema
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}

