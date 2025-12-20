// app/ver/[id]/page.tsx

import DetalhesView from "../detalhes-view";

export default function Page({ params }: { params: { id: string } }) {
  // Pega o ID da URL (ex: /ver/123) e passa para o componente visual
  return <DetalhesView id={params.id} />;
}

// GAMBIARRA: Necessário APENAS para o build do Android passar
export async function generateStaticParams() {
  return [{ id: '1' }];
}
