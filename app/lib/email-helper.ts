// app/lib/email-helper.ts
// Função helper para facilitar o envio de e-mails

interface EnviarEmailParams {
  destinatario: string;
  tipo: 'confirmacao-cadastro' | 'aprovacao-morador' | 'nova-correspondencia';
  dados: any;
}

export async function enviarEmail({ destinatario, tipo, dados }: EnviarEmailParams) {
  try {
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

// ========== EXEMPLOS DE USO ==========

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
  return enviarEmail({
    destinatario: email,
    tipo: 'aprovacao-morador',
    dados: {
      nomeMorador,
      condominioNome,
      email,
      loginUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/login`
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
      dashboardUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard-morador`
    }
  });
}