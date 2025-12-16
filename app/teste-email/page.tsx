'use client';

import { useState } from 'react';
import { EmailService } from '../../services/emailService';

export default function TesteEmailPage() {
  const [status, setStatus] = useState('Aguardando teste...');

  // SEU E-MAIL PARA TESTE
  const MEU_EMAIL = 'eduardodominikus@hotmail.com'; // ⚠️ TROQUE AQUI UMA VEZ SÓ

  // 1. Cadastro
  const testarCadastro = async () => {
    setStatus('Enviando Cadastro...');
    const sucesso = await EmailService.enviarConfirmacaoCadastro(MEU_EMAIL, {
      nomeMorador: 'Fulano de Teste',
      condominioNome: 'Condomínio Solar',
      blocoNome: 'Bloco A',
      numeroUnidade: '101'
    });
    setStatus(sucesso ? '✅ Cadastro enviado!' : '❌ Erro no cadastro');
  };

  // 2. Aprovação
  const testarAprovacao = async () => {
    setStatus('Enviando Aprovação...');
    const sucesso = await EmailService.enviarAprovacaoMorador(MEU_EMAIL, {
      nomeMorador: 'Fulano de Teste',
      condominioNome: 'Condomínio Solar',
      email: 'fulano@teste.com',
      loginUrl: 'http://localhost:3000/login'
    });
    setStatus(sucesso ? '✅ Aprovação enviada!' : '❌ Erro na aprovação');
  };

  // 3. Nova Correspondência
  const testarNovaCorrespondencia = async () => {
    setStatus('Enviando Aviso de Chegada...');
    const sucesso = await EmailService.enviarNovaCorrespondencia(MEU_EMAIL, {
      nomeMorador: 'Fulano de Teste',
      tipoCorrespondencia: 'Caixa Grande (Amazon)',
      dataChegada: '16/12/2025',
      horaChegada: '14:30',
      condominioNome: 'Condomínio Solar',
      blocoNome: 'Bloco A',
      numeroUnidade: '101',
      localRetirada: 'Portaria Principal',
      dashboardUrl: 'http://localhost:3000/dashboard'
    });
    setStatus(sucesso ? '✅ Aviso de correspondência enviado!' : '❌ Erro no aviso');
  };

  // 4. Recibo de Retirada
  const testarRecibo = async () => {
    setStatus('Enviando Recibo...');
    const sucesso = await EmailService.enviarReciboRetirada(MEU_EMAIL, {
      nomeMorador: 'Fulano de Teste',
      tipoCorrespondencia: 'Caixa Grande (Amazon)',
      dataRetirada: '16/12/2025',
      horaRetirada: '18:00',
      quemRetirou: 'O próprio',
      responsavelEntrega: 'Porteiro José',
      condominioNome: 'Condomínio Solar'
    });
    setStatus(sucesso ? '✅ Recibo enviado!' : '❌ Erro no recibo');
  };

  // 5. Aviso Rápido (COM FOTO)
  const testarAvisoRapido = async () => {
    setStatus('Enviando Aviso Rápido...');
    const sucesso = await EmailService.enviarAvisoRapido(MEU_EMAIL, {
      nomeMorador: 'Fulano de Teste',
      condominioNome: 'Condomínio Solar',
      titulo: 'Carro com luz acesa',
      mensagem: 'Olá, verificamos que seu veículo na vaga 12 está com os faróis acesos. Por favor, verifique.',
      dataEnvio: '16/12/2025',
      autor: 'Ronda Noturna',
      // Foto de exemplo (placeholder)
      fotoUrl: 'https://placehold.co/600x400/png' 
    });
    setStatus(sucesso ? '✅ Aviso enviado com anexo!' : '❌ Erro no aviso');
  };

  return (
    <div style={{ padding: '50px', display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '400px' }}>
      <h1>Teste Geral (+ Aviso Rápido)</h1>
      <p>Destino: <strong>{MEU_EMAIL}</strong></p>
      <p>Status: <strong>{status}</strong></p>
      
      <button onClick={testarCadastro} style={estiloBotao('#057321')}>
        1. Testar Cadastro
      </button>

      <button onClick={testarAprovacao} style={estiloBotao('#2563eb')}>
        2. Testar Aprovação
      </button>

      <button onClick={testarNovaCorrespondencia} style={estiloBotao('#d97706')}>
        3. Nova Correspondência 📦
      </button>

      <button onClick={testarRecibo} style={estiloBotao('#4b5563')}>
        4. Recibo de Retirada 📋
      </button>

      <button onClick={testarAvisoRapido} style={estiloBotao('#dc2626')}>
        5. Aviso Rápido (Com Foto) 🚨
      </button>
    </div>
  );
}

const estiloBotao = (cor: string) => ({
  padding: '15px',
  background: cor,
  color: 'white',
  border: 'none',
  borderRadius: '5px',
  cursor: 'pointer',
  fontSize: '16px'
});