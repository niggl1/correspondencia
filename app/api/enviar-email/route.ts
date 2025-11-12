// app/api/enviar-email/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';
import { 
  emailConfirmacaoCadastro 
} from '@/app/lib/email-templates/confirmacao-cadastro';
import { 
  emailAprovacaoMorador 
} from '@/app/lib/email-templates/aprovacao-morador';
import { 
  emailNovaCorrespondencia 
} from '@/app/lib/email-templates/nova-correspondencia';

// Inicializar Resend com API Key
const resend = new Resend(process.env.RESEND_API_KEY);

// E-mail remetente (deve ser verificado no Resend)
const FROM_EMAIL = process.env.EMAIL_FROM || 'noreply@seudominio.com';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tipo, destinatario, dados } = body;

    // Validações
    if (!tipo || !destinatario || !dados) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios: tipo, destinatario, dados' },
        { status: 400 }
      );
    }

    let htmlContent = '';
    let assunto = '';

    // Gerar conteúdo baseado no tipo
    switch (tipo) {
      case 'confirmacao-cadastro':
        assunto = '✅ Cadastro realizado com sucesso!';
        htmlContent = emailConfirmacaoCadastro({
          nomeMorador: dados.nomeMorador,
          condominioNome: dados.condominioNome,
          blocoNome: dados.blocoNome,
          numeroUnidade: dados.numeroUnidade
        });
        break;

      case 'aprovacao-morador':
        assunto = '🎉 Sua conta foi aprovada!';
        htmlContent = emailAprovacaoMorador({
          nomeMorador: dados.nomeMorador,
          condominioNome: dados.condominioNome,
          email: dados.email,
          loginUrl: dados.loginUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/login`
        });
        break;

      case 'nova-correspondencia':
        assunto = '📬 Você tem uma nova correspondência!';
        htmlContent = emailNovaCorrespondencia({
          nomeMorador: dados.nomeMorador,
          tipoCorrespondencia: dados.tipoCorrespondencia,
          dataChegada: dados.dataChegada,
          horaChegada: dados.horaChegada,
          condominioNome: dados.condominioNome,
          blocoNome: dados.blocoNome,
          numeroUnidade: dados.numeroUnidade,
          localRetirada: dados.localRetirada || 'Portaria do condomínio',
          dashboardUrl: dados.dashboardUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/dashboard-morador`
        });
        break;

      default:
        return NextResponse.json(
          { error: 'Tipo de e-mail inválido' },
          { status: 400 }
        );
    }

    // Enviar e-mail via Resend
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: destinatario,
      subject: assunto,
      html: htmlContent
    });

    if (error) {
      console.error('Erro ao enviar e-mail:', error);
      return NextResponse.json(
        { error: 'Erro ao enviar e-mail', details: error },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messageId: data?.id,
      message: 'E-mail enviado com sucesso'
    });

  } catch (error) {
    console.error('Erro na API de envio de e-mail:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}