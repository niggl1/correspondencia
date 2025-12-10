"use client";

import { useEffect, useMemo, useRef, ComponentType } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

export default function withAuth<P extends object>(
  Component: ComponentType<P>,
  allowedRoles?: string[]
) {
  return function ProtectedRoute(props: P) {
    const { user, loading } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const redirectedRef = useRef(false);

    const fallbackRoute = useMemo(() => {
      const role = user?.role;
      switch (role) {
        case "admin":
          return "/dashboard-admin";
        case "responsavel":
          return "/dashboard-responsavel";
        case "porteiro":
          return "/dashboard-porteiro";
        case "morador":
          return "/dashboard-morador";
        default:
          return "/";
      }
    }, [user?.role]);

    useEffect(() => {
      if (loading) return;
      if (redirectedRef.current) return;

      // 1) Não logado
      if (!user) {
        redirectedRef.current = true;
        if (pathname !== "/") router.replace("/");
        return;
      }

      // 2) Sem permissão
      if (allowedRoles && !allowedRoles.includes(user.role)) {
        redirectedRef.current = true;
        if (pathname !== fallbackRoute) router.replace(fallbackRoute);
        return;
      }
    }, [user, loading, router, allowedRoles, fallbackRoute, pathname]);

    if (loading) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
          <Loader2 className="text-[#057321] animate-spin" size={40} />
          <p className="text-gray-500 text-sm mt-2">Verificando acesso...</p>
        </div>
      );
    }

    // Evita flash
    if (!user) return null;
    if (allowedRoles && !allowedRoles.includes(user.role)) return null;

    return <Component {...props} />;
  };
}