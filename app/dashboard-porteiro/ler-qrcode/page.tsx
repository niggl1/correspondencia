"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/Navbar";
import withAuth from "@/components/withAuth";
import { Html5Qrcode } from "html5-qrcode";

function LerQRCodePage() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [cameras, setCameras] = useState<any[]>([]);
  const [selectedCamera, setSelectedCamera] = useState<string>("");

  useEffect(() => {
    // Listar câmeras disponíveis
    Html5Qrcode.getCameras()
      .then((devices) => {
        if (devices && devices.length) {
          setCameras(devices);
          // Selecionar câmera traseira por padrão (se disponível)
          const backCamera = devices.find((device) =>
            device.label.toLowerCase().includes("back")
          );
          setSelectedCamera(backCamera?.id || devices[0].id);
        }
      })
      .catch((err) => {
        console.error("Erro ao listar câmeras:", err);
        setError("Não foi possível acessar as câmeras do dispositivo");
      });

    return () => {
      // Cleanup ao desmontar
      if (scannerRef.current) {
        scannerRef.current
          .stop()
          .catch((err) => console.error("Erro ao parar scanner:", err));
      }
    };
  }, []);

  const startScanning = async () => {
    if (!selectedCamera) {
      setError("Nenhuma câmera selecionada");
      return;
    }

    setError(null);
    setSuccess(null);
    setScanning(true);

    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        selectedCamera,
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        (decodedText) => {
          // QR Code lido com sucesso
          setSuccess("QR Code lido! Abrindo PDF...");
          
          // Parar scanner
          scanner
            .stop()
            .then(() => {
              setScanning(false);
              // Abrir PDF em nova aba
              window.open(decodedText, "_blank");
              
              // Voltar para dashboard após 2 segundos
              setTimeout(() => {
                router.push("/dashboard-porteiro");
              }, 2000);
            })
            .catch((err) => console.error("Erro ao parar scanner:", err));
        },
        (errorMessage) => {
          // Erro de leitura (normal durante scan)
          // Não mostrar erro aqui
        }
      );
    } catch (err: any) {
      console.error("Erro ao iniciar scanner:", err);
      setError("Erro ao iniciar câmera. Verifique as permissões.");
      setScanning(false);
    }
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current
        .stop()
        .then(() => {
          setScanning(false);
          scannerRef.current = null;
        })
        .catch((err) => {
          console.error("Erro ao parar scanner:", err);
          setScanning(false);
        });
    }
  };

  return (
    <div className="space-y-6">
      <Navbar role="porteiro" />

      <div className="max-w-2xl mx-auto px-4 pt-20">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
              <svg
                className="w-8 h-8 text-primary-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Ler QR Code
            </h1>
            <p className="text-gray-600">
              Escaneie o QR Code da correspondência para abrir o PDF
            </p>
          </div>

          {/* Seletor de Câmera */}
          {cameras.length > 1 && !scanning && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecionar Câmera
              </label>
              <select
                value={selectedCamera}
                onChange={(e) => setSelectedCamera(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {cameras.map((camera) => (
                  <option key={camera.id} value={camera.id}>
                    {camera.label || `Câmera ${camera.id}`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Mensagens */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {success}
            </div>
          )}

          {/* Scanner */}
          <div className="mb-6">
            <div
              id="qr-reader"
              className={`${
                scanning ? "block" : "hidden"
              } w-full rounded-lg overflow-hidden border-4 border-primary-500`}
            ></div>

            {!scanning && !success && (
              <div className="bg-gray-100 rounded-lg p-12 text-center">
                <svg
                  className="w-24 h-24 mx-auto text-gray-400 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                  />
                </svg>
                <p className="text-gray-600">
                  Clique no botão abaixo para iniciar a leitura
                </p>
              </div>
            )}
          </div>

          {/* Botões */}
          <div className="flex gap-3">
            <button
              onClick={() => router.push("/dashboard-porteiro")}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition"
            >
              Voltar
            </button>

            {!scanning ? (
              <button
                onClick={startScanning}
                disabled={!selectedCamera || !!success}
                className="flex-1 px-6 py-3 bg-primary-500 text-white rounded-lg font-medium hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Iniciar Scanner
              </button>
            ) : (
              <button
                onClick={stopScanning}
                className="flex-1 px-6 py-3 bg-red-500 text-white rounded-lg font-medium hover:bg-red-600 transition"
              >
                Parar Scanner
              </button>
            )}
          </div>

          {/* Instruções */}
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              📱 Instruções:
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Permita o acesso à câmera quando solicitado</li>
              <li>• Posicione o QR Code dentro do quadrado</li>
              <li>• Mantenha o código estável e bem iluminado</li>
              <li>• O PDF será aberto automaticamente após a leitura</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

export default withAuth(LerQRCodePage, ["porteiro", "responsavel", "adminMaster"]);