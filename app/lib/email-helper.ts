// ✅ Este arquivo NÃO deve importar os templates. Ele apenas dispara a API.

interface EnviarEmailParams {
  destinatario: string;
  tipo: 'confirmacao-cadastro' | 'aprovacao-morador' | 'nova-correspondencia' | 'recibo-retirada';
  dados: any;
}

async function enviarEmail({ destinatario, tipo, dados }: EnviarEmailParams) {
  try {
    // Ajuste se sua rota for diferente (ex: /api/send ou /api/enviar-email)
    const response = await fetch('/api/enviar-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        destinatario,
        tipo,
        dados
      })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error('Erro ao enviar e-mail:', result);
      return { success: false, error: result.error };
    }

    return { success: true, data: result };
  } catch (error) {
    console.error('Erro ao chamar API de e-mail:', error);
    return { success: false, error: 'Erro ao enviar e-mail' };
  }
}

// 1. Confirmação de cadastro
export async function enviarConfirmacaoCadastro(
  email: string,
  nomeMorador: string,
  condominioNome: string,
  blocoNome: string,
  numeroUnidade: string
) {
  return enviarEmail({
    destinatario: email,
    tipo: 'confirmacao-cadastro',
    dados: {
      nomeMorador,
      condominioNome,
      blocoNome,
      numeroUnidade
    }
  });
}

// 2. Aprovação de morador
export async function enviarAprovacaoMorador(
  email: string,
  nomeMorador: string,
  condominioNome: string
) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return enviarEmail({
    destinatario: email,
    tipo: 'aprovacao-morador',
    dados: {
      nomeMorador,
      condominioNome,
      email,
      loginUrl: `${baseUrl}/login`
    }
  });
}

// 3. Nova correspondência
export async function enviarNovaCorrespondencia(
  email: string,
  nomeMorador: string,
  tipoCorrespondencia: string,
  dataChegada: string,
  horaChegada: string,
  condominioNome: string,
  blocoNome: string,
  numeroUnidade: string,
  localRetirada?: string
) {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : '';
  return enviarEmail({
    destinatario: email,
    tipo: 'nova-correspondencia',
    dados: {
      nomeMorador,
      tipoCorrespondencia,
      dataChegada,
      horaChegada,
      condominioNome,
      blocoNome,
      numeroUnidade,
      localRetirada: localRetirada || 'Portaria do condomínio',
      dashboardUrl: `${baseUrl}/dashboard-morador`
    }
  });
}

// 4. Recibo de Retirada
export async function enviarReciboRetirada(
  email: string,
  nomeMorador: string,
  tipoCorrespondencia: string,
  dataRetirada: string,
  horaRetirada: string,
  quemRetirou: string,
  responsavelEntrega: string,
  condominioNome: string
) {
  return enviarEmail({
    destinatario: email,
    tipo: 'recibo-retirada',
    dados: {
      nomeMorador,
      tipoCorrespondencia,
      dataRetirada,
      horaRetirada,
      quemRetirou,
      responsavelEntrega,
      condominioNome
    }
  });
}