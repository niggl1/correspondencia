"use client";

import { useEffect, ComponentType } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export default function withAuth<P extends object>(
  Component: ComponentType<P>,
  allowedRoles?: string[]
) {
  return function ProtectedRoute(props: P) {
    const { user, loading } = useAuth();
    const router = useRouter();

    useEffect(() => {
      if (!loading) {
        // 1. Se não estiver logado, manda pro Login
        if (!user) {
          router.push("/");
          return;
        }

        // 2. Se tiver regras de cargo e o usuário não tiver o cargo permitido
        if (allowedRoles && !allowedRoles.includes(user.role)) {
          // Redireciona para o painel correto dele para evitar loop ou erro 403
          switch (user.role) {
            case "admin": router.push("/dashboard-admin"); break;
            case "responsavel": router.push("/dashboard-responsavel"); break;
            case "porteiro": router.push("/dashboard-porteiro"); break;
            case "morador": router.push("/dashboard-morador"); break;
            default: router.push("/");
          }
        }
      }
    }, [user, loading, router]);

    if (loading) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
          <Loader2 className="text-[#057321] animate-spin" size={40} />
          <p className="text-gray-500 text-sm mt-2">Verificando acesso...</p>
        </div>
      );
    }

    // Evita "flash" de conteúdo proibido antes do redirect acontecer
    if (!user) return null;
    if (allowedRoles && !allowedRoles.includes(user.role)) return null;

    return <Component {...props} />;
  };
}
