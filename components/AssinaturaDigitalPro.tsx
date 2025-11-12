"use client";

import { useRef, useState, useEffect } from "react";
import SignatureCanvas from "react-signature-canvas";

interface AssinaturaDigitalProProps {
  onSave: (assinatura: string) => void;
  assinaturaInicial?: string;
  label: string;
  obrigatorio?: boolean;
  placeholder?: string;
}

export default function AssinaturaDigitalPro({
  onSave,
  assinaturaInicial,
  label,
  obrigatorio = false,
  placeholder = "Assine aqui usando o mouse ou toque na tela",
}: AssinaturaDigitalProProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [assinaturaSalva, setAssinaturaSalva] = useState(assinaturaInicial || "");

  useEffect(() => {
    if (assinaturaInicial && sigCanvas.current) {
      sigCanvas.current.fromDataURL(assinaturaInicial);
      setAssinaturaSalva(assinaturaInicial);
    }
  }, [assinaturaInicial]);

  function limpar() {
    sigCanvas.current?.clear();
    setAssinaturaSalva("");
  }

  function salvar() {
    if (sigCanvas.current?.isEmpty()) {
      alert("Por favor, assine antes de salvar");
      return;
    }

    const assinatura = sigCanvas.current?.toDataURL() || "";
    setAssinaturaSalva(assinatura);
    onSave(assinatura);
  }

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {obrigatorio && <span className="text-red-500 ml-1">*</span>}
      </label>

      {assinaturaSalva ? (
        <div className="border-2 border-primary-300 rounded-lg p-4 bg-primary-50">
          <img
            src={assinaturaSalva}
            alt="Assinatura"
            className="w-full h-40 object-contain bg-white rounded"
          />
          <button
            type="button"
            onClick={limpar}
            className="mt-3 w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
          >
            Alterar Assinatura
          </button>
        </div>
      ) : (
        <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
          <div className="relative">
            <SignatureCanvas
              ref={sigCanvas}
              canvasProps={{
                className: "w-full h-40 touch-none",
                style: { touchAction: "none" },
              }}
            />
            {sigCanvas.current?.isEmpty() && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <p className="text-gray-400 text-sm">{placeholder}</p>
              </div>
            )}
          </div>
          <div className="flex gap-2 p-3 bg-gray-50 border-t">
            <button
              type="button"
              onClick={limpar}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-white transition"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={salvar}
              className="flex-1 px-4 py-2 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 transition"
            >
              Salvar Assinatura
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500">
        {assinaturaSalva
          ? "✓ Assinatura capturada com sucesso"
          : "Assine no espaço acima para continuar"}
      </p>
    </div>
  );
}
