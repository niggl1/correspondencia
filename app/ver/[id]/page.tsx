// app/ver/[id]/page.tsx

// 👇 AJUSTE AQUI: Mudamos de "./" para "../" pois o arquivo está na pasta anterior
import DetalhesView from "../detalhes-view";

// Função necessária para evitar erros de build no Capacitor (Static Export)
export async function generateStaticParams() {
  return []; // Permite qualquer ID dinâmico
}

export default function Page({ params }: { params: { id: string } }) {
  // Pega o ID da URL (ex: /ver/123) e passa para o componente visual
  return <DetalhesView id={params.id} />;
}