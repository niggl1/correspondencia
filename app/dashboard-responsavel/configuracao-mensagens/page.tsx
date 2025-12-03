"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, MessageSquare } from "lucide-react";
import TemplateManager from "@/components/TemplateManager";
import withAuth from "@/components/withAuth";
import { useAuth } from "@/hooks/useAuth";

function ConfiguracaoMensagensPage() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Cabeçalho */}
        <div className="flex items-center gap-4 mb-8">
          <button 
            onClick={() => router.back()} 
            className="p-2 bg-white rounded-full shadow-sm hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-6 h-6 text-gray-600" />
          </button>
          
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <MessageSquare className="w-7 h-7 text-[#057321]" />
              Configuração de Mensagens
            </h1>
            <p className="text-sm text-gray-500">
              Personalize os textos automáticos enviados via WhatsApp e E-mail.
            </p>
          </div>
        </div>

        {/* Componente Gerenciador */}
        {user?.condominioId ? (
          <TemplateManager condoId={user.condominioId} />
        ) : (
          <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200">
            Carregando informações do condomínio...
          </div>
        )}
      </div>
    </div>
  );
}

// Proteção de Rota
export default withAuth(ConfiguracaoMensagensPage, ["responsavel", "admin", "adminMaster"]);
