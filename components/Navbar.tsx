"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { LogOut, Menu, User } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/app/lib/firebase";
import { useAuth } from "@/hooks/useAuth";

export default function NavbarSimples() {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
    router.push("/login");
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
    <nav className="fixed top-0 left-0 right-0 bg-white border-b shadow-sm z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-14">
          {/* logo / nome */}
          <div className="flex items-center space-x-3">
            <Image
              src="/logo-app-correspondencia.png"
              alt="Logo"
              width={40}
              height={40}
              className="object-contain"
            />
            <span className="font-bold text-primary-600 text-lg">APP CORRESPONDÊNCIA</span>
          </div>

          {/* links desktop - SEM BOTÕES */}
          <div className="hidden md:flex items-center space-x-6">
            {/* Perfil do usuário */}
            {user && (
              <Link
                href="/minha-conta"
                className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition"
              >
                <span className="text-gray-600">Perfil: <span className="font-semibold text-gray-800">{getRoleLabel(user.role)}</span></span>
                <div className="flex items-center gap-2">
                  <User size={18} className="text-primary-600" />
                  <span className="font-medium text-gray-800">{user.nome || "Usuário"}</span>
                </div>
              </Link>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition"
            >
              <LogOut size={18} /> Sair
            </button>
          </div>

          {/* botão mobile */}
          <div className="md:hidden">
            <button onClick={() => setOpen(!open)} className="p-2 rounded hover:bg-gray-100">
              <Menu size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* menu mobile */}
      {open && (
        <div className="md:hidden border-t bg-white shadow-inner animate-fade-in">
          <div className="flex flex-col p-3 space-y-2">
            {/* Perfil mobile */}
            {user && (
              <Link
                href="/minha-conta"
                onClick={() => setOpen(false)}
                className="flex flex-col gap-1 py-2 px-3 rounded-lg bg-gray-100 text-gray-800"
              >
                <div className="flex items-center gap-2">
                  <User size={18} className="text-primary-600" />
                  <span className="font-medium">{user.nome || "Usuário"}</span>
                </div>
                <span className="text-xs text-gray-600">Perfil: {getRoleLabel(user.role)}</span>
              </Link>
            )}

            <button
              onClick={handleLogout}
              className="flex items-center gap-2 py-2 px-3 rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
            >
              <LogOut size={18} /> Sair
            </button>
          </div>
        </div>
      )}
    </nav>
  );
}