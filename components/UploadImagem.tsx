"use client";

import { useState, useRef, ChangeEvent } from "react";
import { Camera, X, Image as ImageIcon, UploadCloud } from "lucide-react";

interface UploadImagemProps {
  onUpload: (file: File | null) => void;
}

export default function UploadImagem({ onUpload }: UploadImagemProps) {
  const [preview, setPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const objectUrl = URL.createObjectURL(file);
      setPreview(objectUrl);
      onUpload(file);
    }
  };

  const handleRemove = () => {
    setPreview(null);
    onUpload(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const triggerInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        capture="environment" // Abre a câmera traseira no mobile diretamente
        className="hidden"
      />

      {!preview ? (
        <button
          onClick={triggerInput}
          className="w-full group relative flex flex-col items-center justify-center h-48 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-white hover:border-[#057321] transition-all duration-200 cursor-pointer"
        >
          <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-200 mb-3">
            <Camera className="text-[#057321] w-8 h-8" />
          </div>
          <span className="text-sm font-semibold text-gray-700 group-hover:text-[#057321]">
            Tirar Foto ou Escolher da Galeria
          </span>
          <span className="text-xs text-gray-500 mt-1">
            (Câmera nativa do celular)
          </span>
        </button>
      ) : (
        <div className="relative w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-white p-2">
          <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-gray-100">
            <img
              src={preview}
              alt="Preview da encomenda"
              className="w-full h-full object-contain"
            />
          </div>
          
          <div className="flex items-center justify-between mt-3 px-2 pb-1">
            <div className="flex items-center gap-2 text-green-700 font-medium text-sm">
              <ImageIcon size={16} />
              <span>Foto anexada</span>
            </div>
            <button
              onClick={handleRemove}
              className="flex items-center gap-1 text-red-600 hover:text-red-700 text-sm font-medium bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition-colors"
            >
              <X size={16} />
              Remover
            </button>
          </div>
        </div>
      )}
    </div>
  );
}