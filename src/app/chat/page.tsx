'use client';
import Script from 'next/script';
import { Logo } from '@/components/icons';
import Link from 'next/link';
import { ArrowLeft, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ChatPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        /* Oculta o FAB flutuante padrão da Zaia para usarmos o nosso botão centralizado */
        #chatbot-fab { display: none !important; }
      `}} />

      <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background Decorativo */}
      <div className="absolute inset-0 z-0 opacity-20">
        <div className="absolute top-0 -left-4 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"></div>
        <div className="absolute top-0 -right-4 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"></div>
      </div>

      <div className="z-10 text-center space-y-6 max-w-lg px-6">
        <div className="flex justify-center mb-8 animate-in slide-in-from-top-4 duration-700">
          <Logo className="h-20 w-20 text-white drop-shadow-2xl" />
        </div>
        
        <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight animate-in fade-in duration-1000">
          Como podemos ajudar?
        </h1>
        
        <p className="text-lg text-slate-300 font-medium animate-in fade-in duration-1000 delay-150">
          Inicie uma conversa no chat abaixo para ser atendido pelo nosso assistente virtual.
        </p>

        <div className="pt-12 animate-in fade-in duration-1000 delay-300 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button 
            size="lg"
            className="rounded-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-8 shadow-lg shadow-indigo-500/25 transition-transform active:scale-95"
            onClick={() => {
              const fab = document.querySelector('#chatbot-fab') as HTMLElement;
              if (fab) fab.click();
            }}
          >
            <MessageCircle className="mr-2 size-5" /> Clique aqui para conversar
          </Button>

          <Button asChild variant="outline" className="rounded-full bg-white/5 border-white/10 text-white hover:bg-white/10 font-bold backdrop-blur-md">
            <Link href="/login">
              Voltar
            </Link>
          </Button>
        </div>
      </div>
    </div>

      {/* 
        Scripts da Zaia 
        Nota: O script da Zaia tem um bug onde, se rodar em 'localhost', ele tenta puxar o CSS de 'localhost:5173'.
        Para corrigir isso, injetamos o CSS oficial da Zaia manualmente aqui.
      */}
      <link rel="stylesheet" href="https://widget.endless.zaia.app/script/style.css" />
      
      <Script id="zaia-config" strategy="afterInteractive">
        {`
          // Adicionamos um identificador único para forçar o chat a entender que é uma nova sessão
          const sessionId = "sessao_" + Math.random().toString(36).substring(7) + "_" + Date.now();
          window.ZV2Widget = {
            ChannelURL: "https://widget.endless.zaia.app/widget/channel/9e61f275-3905-4ef1-a3d8-663410d54649?theme=dark&context=" + encodeURIComponent(sessionId),
          };

          // Tenta limpar qualquer contexto anterior assim que a janela carregar
          window.addEventListener('load', function() {
            if (window.zaia && window.zaia.context) {
              window.zaia.context.clear();
              window.zaia.context.set(sessionId);
            }
          });
        `}
      </Script>
      <Script 
        src="https://widget.endless.zaia.app/script/widget-loader.js" 
        strategy="afterInteractive"
      />
    </>
  );
}
