// Função para listar variáveis disponíveis
export const getAvailableVariables = (category: string): string[] => {
  const common = ["NOME", "CONDOMINIO", "DATA"];
  
  if (category === "ARRIVAL") return [...common, "PROTOCOLO", "CODIGO", "LINK", "BLOCO", "APTO"];
  if (category === "PICKUP") return [...common, "PROTOCOLO", "CODIGO", "RETIRADO_POR"];
  if (category === "WARNING") return [...common, "PROTOCOLO", "BLOCO", "APTO", "FOTO"]; // Adicionado para Avisos Rápidos
  
  return common;
};

// Função principal de substituição
export const parseTemplate = (
  content: string, 
  variables: Record<string, string>
): string => {
  let parsed = content;

  Object.entries(variables).forEach(([key, value]) => {
    // Cria a expressão regular para substituir {VARIAVEL}
    const regex = new RegExp(`{${key}}`, "g");
    parsed = parsed.replace(regex, value || "");
  });

  return parsed;
};

// Mantém compatibilidade com outros arquivos que usam este nome
export const replaceVariables = parseTemplate;