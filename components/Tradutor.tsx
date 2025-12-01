"use client";

import { useEffect } from "react";

const Tradutor = () => {
  useEffect(() => {
    const addScript = document.createElement("script");
    addScript.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
    addScript.async = true;
    document.body.appendChild(addScript);

    (window as any).googleTranslateElementInit = () => {
      new (window as any).google.translate.TranslateElement(
        {
          pageLanguage: "pt",
          // Adicione aqui as línguas que você quer dar suporte
          includedLanguages: "en,es,fr,it,de,pt", 
          layout: (window as any).google.translate.TranslateElement.InlineLayout.SIMPLE,
          autoDisplay: false,
        },
        "google_translate_element"
      );
    };
  }, []);

  // Estilização para ficar flutuante no canto inferior direito
  return (
    <div 
      id="google_translate_element" 
      className="fixed bottom-4 right-4 z-[9999] opacity-90 hover:opacity-100 transition-opacity"
    />
  );
};

export default Tradutor;