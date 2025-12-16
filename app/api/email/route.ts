import { NextRequest, NextResponse } from 'next/server';
import { Resend } from 'resend';

// Templates
import { emailConfirmacaoCadastro, ConfirmacaoCadastroData } from '../../lib/email-templates/confirmacao-cadastro';
import { emailAprovacaoMorador, AprovacaoMoradorData } from '../../lib/email-templates/aprovacao-morador';
import { emailNovaCorrespondencia, NovaCorrespondenciaData } from '../../lib/email-templates/nova-correspondencia';
import { emailReciboRetirada, ReciboRetiradaData } from '../../lib/email-templates/recibo-retirada';
import { emailAvisoRapido, AvisoRapidoData } from '../../lib/email-templates/aviso-rapido'; // <--- NOVO IMPORT

type EmailRequestBody =
  | { tipo: 'confirmacao-cadastro'; destinatario: string; dados: ConfirmacaoCadastroData }
  | { tipo: 'aprovacao-morador'; destinatario: string; dados: AprovacaoMoradorData }
  | { tipo: 'nova-correspondencia'; destinatario: string; dados: NovaCorrespondenciaData }
  | { tipo: 'recibo-retirada'; destinatario: string; dados: ReciboRetiradaData }
  | { tipo: 'aviso-rapido'; destinatario: string; dados: AvisoRapidoData }; // <--- NOVO TIPO

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.EMAIL_FROM!;
const REPLY_TO_EMAIL = process.env.EMAIL_REPLY_TO;

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as EmailRequestBody;
    const { tipo, destinatario, dados } = body;

    // Validações
    if (!tipo || !destinatario || !dados) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    let subject = '';
    let htmlContent = '';
    let attachments: any[] = []; // Array para anexos

    switch (tipo) {
      case 'confirmacao-cadastro':
        subject = '✅ Cadastro recebido! Aguardando aprovação';
        htmlContent = emailConfirmacaoCadastro(dados as ConfirmacaoCadastroData);
        break;

      case 'aprovacao-morador':
        subject = '🎉 Seu acesso foi aprovado!';
        htmlContent = emailAprovacaoMorador(dados as AprovacaoMoradorData);
        break;

      case 'nova-correspondencia':
        subject = '📬 Nova correspondência recebida';
        htmlContent = emailNovaCorrespondencia(dados as NovaCorrespondenciaData);
        break;

      case 'recibo-retirada':
        subject = '📋 Comprovante de retirada';
        htmlContent = emailReciboRetirada(dados as ReciboRetiradaData);
        break;
      
      // --- NOVO CASE ---
      case 'aviso-rapido':
        const avisoDados = dados as AvisoRapidoData;
        subject = `🔔 Aviso: ${avisoDados.titulo}`;
        htmlContent = emailAvisoRapido(avisoDados);
        
        // Se tiver URL da foto, adiciona como anexo
        if (avisoDados.fotoUrl) {
          attachments = [{
            filename: 'foto-aviso.jpg',
            path: avisoDados.fotoUrl, // A Resend baixa a imagem da URL e anexa
          }];
        }
        break;

      default:
        return NextResponse.json({ error: 'Tipo de email inválido' }, { status: 400 });
    }

    // Envio
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: destinatario,
      replyTo: REPLY_TO_EMAIL,
      subject,
      html: htmlContent,
      attachments: attachments.length > 0 ? attachments : undefined, // Envia anexo se existir
    });

    if (error) {
      console.error('Erro Resend:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, emailId: data?.id });

  } catch (err) {
    console.error('Erro interno:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
