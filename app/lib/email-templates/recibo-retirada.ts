import { emailBaseTemplate, infoBoxGreen } from './base-template';

interface ReciboRetiradaData {
  nomeMorador: string;
  tipoCorrespondencia: string;
  dataRetirada: string;
  horaRetirada: string;
  quemRetirou: string;
  responsavelEntrega: string;
  condominioNome: string;
}

export const emailReciboRetirada = (data: ReciboRetiradaData) => {
  const content = `
    <h2 style="margin: 0 0 20px 0; color: #111827; font-size: 24px;">
      Comprovante de Retirada 📋
    </h2>

    <p style="margin: 0 0 16px 0; color: #374151; font-size: 16px; line-height: 1.6;">
      Olá, <strong>${data.nomeMorador}</strong>.
    </p>

    <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
      Este e-mail confirma que uma correspondência foi retirada na portaria do <strong>${data.condominioNome}</strong>.
    </p>

    ${infoBoxGreen(`
      <strong>Detalhes da Retirada:</strong><br><br>
      📦 <strong>Item:</strong> ${data.tipoCorrespondencia}<br>
      📅 <strong>Data:</strong> ${data.dataRetirada}<br>
      🕐 <strong>Hora:</strong> ${data.horaRetirada}<br>
      👤 <strong>Retirado por:</strong> ${data.quemRetirou}<br>
      👮 <strong>Entregue por:</strong> ${data.responsavelEntrega}
    `)}

    <p style="margin: 30px 0 0 0; color: #6b7280; font-size: 13px; line-height: 1.6;">
      Este registro serve como comprovante digital de entrega finalizada.
    </p>
  `;

  return emailBaseTemplate(content);
};