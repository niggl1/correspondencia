import GerenciarUnidades from "@/components/GerenciarUnidades";
import Navbar from "@/components/Navbar";

export default function UnidadesPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="pt-20 space-y-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Texto Explicativo em Destaque */}
        <div className="bg-blue-50 border-l-4 border-blue-500 p-6 rounded-lg shadow-sm">
          <div className="flex items-start gap-3">
            <svg 
              className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path 
                strokeLinecap="round" 
                strokeLinejoin="round" 
                strokeWidth={2} 
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
              />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-blue-900 mb-2">
                💡 Quando usar Unidades Especiais?
              </h3>
              <p className="text-blue-800 leading-relaxed">
                Se o seu condomínio <strong>não é tradicional</strong> (apartamentos ou casas residenciais), 
                utilize esta função para cadastrar <strong>unidades especiais</strong> como: galpões industriais, 
                salas comerciais, escritórios, lojas, boxes, depósitos ou qualquer outro tipo de unidade não residencial. 
                Esta funcionalidade permite gerenciar condomínios empresariais, comerciais ou mistos de forma adequada.
              </p>
            </div>
          </div>
        </div>

        {/* Componente de Gerenciamento */}
        <GerenciarUnidades />
      </div>
    </div>
  );
}