import { redirect } from "next/navigation";

export default function VerPage() {
  // Redireciona para a página inicial se alguém acessar "/ver" sem o código
  redirect("/");
}