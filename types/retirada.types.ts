/**
 * Resultado do envio de notificações
 */
export interface ResultadoNotificacao {
  whatsapp: {
    enviado: boolean;
    erro?: string;
  };
  email: {
    enviado: boolean;
    erro?: string;
  };
  sms: {
    enviado: boolean;
    erro?: string;
  };
}

/**
 * Padrões default
 */
export const CONFIGURACOES_DEFAULT: ConfiguracoesRetirada = {
  assinaturaMoradorObrigatoria: true,
  assinaturaPorteiroObrigatoria: true,
  fotoDocumentoObrigatoria: false,
  selfieObrigatoria: false,
  geolocalizacaoObrigatoria: false,
  enviarWhatsApp: true,
  enviarEmail: true,
  enviarSMS: false,
  verificarMoradorAutorizado: true,
  permitirRetiradaTerceiro: false,
  exigirCodigoConfirmacao: false,
  incluirFotoCorrespondencia: true,
  incluirQRCode: true,
  incluirLogoCondominio: false,
  permitirRetiradaParcial: false,
  exigirAvaliacaoServico: false,
};
