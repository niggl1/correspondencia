import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// ✅ CORREÇÃO DE CAMINHOS RELATIVOS
// Como estamos em app/api/enviar-email/route.ts, subimos 2 níveis (../../) para chegar em app/
// e então entramos em lib/email-templates
import { emailConfirmacaoCadastro } from '../../lib/email-templates/confirmacao-cadastro';
import { emailAprovacaoMorador } from '../../lib/email-templates/aprovacao-morador';
import { emailNovaCorrespondencia } from '../../lib/email-templates/nova-correspondencia';
import { emailReciboRetirada } from '../../lib/email-templates/recibo-retirada';

type EmailType = 
  | 'confirmacao-cadastro' 
  | 'aprovacao-morador' 
  | 'nova-correspondencia'
  | 'recibo-retirada';

interface EmailRequestBody {
  tipo: EmailType;
  destinatario: string;
  dados: Record<string, any>;
}

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.EMAIL_FROM || 'onboarding@resend.dev';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as EmailRequestBody;
    const { tipo, destinatario, dados } = body;

    if (!tipo || !destinatario || !dados) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    let htmlContent = '';
    let subject = '';

    switch (tipo) {
      case 'confirmacao-cadastro':
        subject = '✅ Cadastro recebido! Aguardando aprovação.';
        htmlContent = emailConfirmacaoCadastro(dados as any);
        break;

      case 'aprovacao-morador':
        subject = '🎉 Bem-vindo! Seu acesso foi aprovado.';
        htmlContent = emailAprovacaoMorador(dados as any);
        break;

      case 'nova-correspondencia':
        subject = '📬 Você tem uma nova correspondência!';
        htmlContent = emailNovaCorrespondencia(dados as any);
        break;

      case 'recibo-retirada':
        subject = '📋 Comprovante de Retirada';
        htmlContent = emailReciboRetirada(dados as any);
        break;
        
      default:
        return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
    }

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: destinatario,
      subject: subject,
      html: htmlContent,
    });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ success: true, id: data?.id });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}