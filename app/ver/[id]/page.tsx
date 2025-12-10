// Importamos a lógica visual do arquivo que acabamos de criar
import DetalhesView from "../detalhes-view";

// Isso engana o build estático
export async function generateStaticParams() {
  return [{ id: 'demo' }];
}

// Componente Servidor (não tem 'use client')
export default function Page({ params }: { params: { id: string } }) {
  // Passa o ID para o componente visual
  return <DetalhesView id={params.id} />;
}