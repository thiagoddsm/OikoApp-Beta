
'use client';

import React, { useEffect } from 'react';

export default function JantarDosNamoradosLayout({ children }: { children: React.ReactNode }) {

  useEffect(() => {
    // O script de animação é movido para o layout para garantir que ele seja carregado corretamente.
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('opacity-100', 'translate-y-0');
                entry.target.classList.remove('opacity-0', 'translate-y-10');
            }
        });
    }, { threshold: 0.1 });

    const sections = document.querySelectorAll('section');
    sections.forEach((section) => {
        section.classList.add('transition-all', 'duration-1000', 'opacity-0', 'translate-y-10');
        observer.observe(section);
    });

    // Limpeza ao desmontar o componente
    return () => {
      sections.forEach((section) => {
        observer.unobserve(section);
      });
    };
  }, []);

  return (
    <html lang="pt-BR">
      <head>
        <title>Jantar dos Namorados 2026 | IBM - O Riso que Restaura</title>
        <meta name="description" content="Uma experiência completa de entretenimento e gastronomia para casais na IBM. Stand Up com Welson Nunes e Menu Gourmet." />
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" rel="stylesheet" />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;900&family=Playfair+Display:ital,wght@0,700;1,700&display=swap');
              body { font-family: 'Inter', sans-serif; background-color: #ffffff; scroll-behavior: smooth; }
              h1, h2, h3 { font-family: 'Playfair Display', serif; }
              .font-sans-bold { font-family: 'Inter', sans-serif; font-weight: 800; }
              .hero-bg {
                  background: linear-gradient(rgba(15, 23, 42, 0.7), rgba(15, 23, 42, 0.7)), 
                              url(\'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?q=80&w=1200&auto=format&fit=crop\');
                  background-size: cover;
                  background-position: center;
              }
              .glass-nav {
                  background: rgba(255, 255, 255, 0.9);
                  backdrop-filter: blur(10px);
              }
              .cta-button {
                  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                  box-shadow: 0 10px 20px -5px rgba(225, 29, 72, 0.4);
              }
              .cta-button:hover {
                  transform: translateY(-3px) scale(1.02);
                  box-shadow: 0 20px 25px -5px rgba(225, 29, 72, 0.5);
              }
              .card-menu:hover i {
                  transform: scale(1.2) rotate(10deg);
              }
            `,
          }}
        />
      </head>
      <body className="text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
