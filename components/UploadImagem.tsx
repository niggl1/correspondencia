"use client";

import React, { useState } from "react";

interface UploadImagemProps {
  onUpload: (file: File | null) => void; // ✅ Agora retorna File em vez de URL
  label?: string;
}

export default function UploadImagem({ onUpload, label }: UploadImagemProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    
    if (!file) {
      // Se não há arquivo, limpa tudo
      setPreview(null);
      setFileName("");
      onUpload(null);
      return;
    }

    console.log("📸 Arquivo selecionado:", {
      nome: file.name,
      tamanho: `${(file.size / 1024).toFixed(2)} KB`,
      tipo: file.type,
    });

    // Cria preview local (não faz upload ainda!)
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Salva nome do arquivo
    setFileName(file.name);

    // ✅ Retorna o File object (não a URL!)
    onUpload(file);
  };

  const handleRemove = () => {
    setPreview(null);
    setFileName("");
    onUpload(null);
  };

  return (
    <div className="flex flex-col gap-2 p-2 border rounded-lg bg-gray-50">
      <label className="font-medium text-gray-700">
        {label || "Foto da correspondência"}
      </label>

      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="border p-2 rounded-md bg-white"
      />

      {fileName && (
        <p className="text-sm text-gray-600">
          📎 Arquivo: <span className="font-medium">{fileName}</span>
        </p>
      )}

      {preview && (
        <div className="relative">
          <img
            src={preview}
            alt="Prévia"
            className="mt-2 w-40 h-40 object-cover rounded-lg shadow"
          />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
          >
            ✕
          </button>
        </div>
      )}

      <p className="text-xs text-gray-500">
        ℹ️ A imagem será comprimida e enviada ao registrar a correspondência.
      </p>
    </div>
  );
}