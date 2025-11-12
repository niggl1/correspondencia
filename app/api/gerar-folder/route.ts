// app/api/gerar-folder/route.ts

import { NextRequest, NextResponse } from 'next/server';
import QRCode from 'qrcode';

export async function POST(request: NextRequest) {
  try {
    const { condominioId, condominioNome, condominioEndereco } = await request.json();

    if (!condominioId) {
      return NextResponse.json({ error: 'ID do condomínio é obrigatório' }, { status: 400 });
    }

    // Gerar URL de cadastro com ID do condomínio
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const cadastroUrl = `${baseUrl}/cadastro-morador?condominio=${condominioId}`;

    // Gerar QR Code como data URL
    const qrCodeDataUrl = await QRCode.toDataURL(cadastroUrl, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    // Retornar dados para o frontend gerar o PDF
    return NextResponse.json({
      success: true,
      qrCode: qrCodeDataUrl,
      cadastroUrl,
      condominioNome,
      condominioEndereco
    });

  } catch (error) {
    console.error('Erro ao gerar folder:', error);
    return NextResponse.json({ error: 'Erro ao gerar folder' }, { status: 500 });
  }
}