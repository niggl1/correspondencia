export default function DashboardAdminPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Admin</h1>
        <p className="text-gray-600 mt-2">Bem-vindo ao painel administrativo</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card Responsáveis */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Responsáveis</h2>
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <p className="text-gray-600 mb-4">Gerenciar síndicos e responsáveis</p>
          <a
            href="/dashboard-admin/responsaveis"
            className="inline-block px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Acessar
          </a>
        </div>

        {/* Card Condomínios */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Condomínios</h2>
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <p className="text-gray-600 mb-4">Gerenciar condomínios cadastrados</p>
          <a
            href="/dashboard-admin/condominios"
            className="inline-block px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Acessar
          </a>
        </div>

        {/* Card Relatórios */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Relatórios</h2>
            <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <p className="text-gray-600 mb-4">Visualizar estatísticas e relatórios</p>
          <a
            href="/dashboard-admin/relatorios"
            className="inline-block px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
          >
            Acessar
          </a>
        </div>
      </div>

      {/* Estatísticas Rápidas */}
      <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Total de Condomínios</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">-</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Total de Responsáveis</p>
          <p className="text-2xl font-bold text-green-900 mt-1">-</p>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4">
          <p className="text-sm text-yellow-600 font-medium">Total de Porteiros</p>
          <p className="text-2xl font-bold text-yellow-900 mt-1">-</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4">
          <p className="text-sm text-purple-600 font-medium">Correspondências Hoje</p>
          <p className="text-2xl font-bold text-purple-900 mt-1">-</p>
        </div>
      </div>
    </div>
  );
}
