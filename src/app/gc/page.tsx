'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';

export default function GCPage() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      {
        threshold: 0.2,
      }
    );

    document.querySelectorAll('.fade-up').forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="text-slate-200 bg-[#020617] overflow-x-hidden font-sans selection:bg-yellow-400/30">
      <style dangerouslySetInnerHTML={{ __html: `
        html {
          scroll-behavior: smooth;
        }
        .gradient-text {
          background: linear-gradient(to right, #facc15, #fde68a);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .glass {
          background: rgba(15, 23, 42, .55);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, .06);
        }
        .hero-overlay {
          background: 
            radial-gradient(circle at top left, rgba(99, 102, 241, .25), transparent 30%),
            radial-gradient(circle at bottom right, rgba(16, 185, 129, .18), transparent 25%),
            linear-gradient(to bottom, rgba(2, 6, 23, .75), rgba(2, 6, 23, .95));
        }
        .floating {
          animation: floating 6s ease-in-out infinite;
        }
        @keyframes floating {
          0% { transform: translateY(0px) }
          50% { transform: translateY(-10px) }
          100% { transform: translateY(0px) }
        }
        .fade-up {
          opacity: 0;
          transform: translateY(40px);
          transition: .8s ease;
        }
        .fade-up.visible {
          opacity: 1;
          transform: translateY(0);
        }
        .glow {
          box-shadow: 0 0 40px rgba(250, 204, 21, .15);
        }
        .section-blur {
          position: absolute;
          width: 500px;
          height: 500px;
          border-radius: 999px;
          filter: blur(120px);
          opacity: .12;
          z-index: 0;
        }
      ` }} />

      {/* NAVBAR */}
      <header className="fixed top-0 left-0 w-full z-50 border-b border-white/5 bg-slate-950/70 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative w-12 h-12 flex items-center justify-center">
              <img 
                src="https://firebasestorage.googleapis.com/v0/b/studio-1424813022-71754.firebasestorage.app/o/C%C3%B3pia%20de%20LOGO%20IBM%20BRANCO.PNG?alt=media&token=85d35afe-f7f6-40d6-a9cd-c138c6a326fa" 
                alt="Logo IBM" 
                className="w-full h-auto object-contain"
              />
            </div>
            <div>
              <h1 className="font-black tracking-tight text-white text-lg">
                Experiência GC
              </h1>
              <p className="text-xs text-slate-400 -mt-1">
                Igreja Batista da Manhã
              </p>
            </div>
          </div>

          <a 
            href="https://wa.me/5521997558801"
            className="hidden md:flex items-center gap-2 bg-yellow-400 hover:bg-yellow-300 text-slate-950 px-6 py-3 rounded-xl font-bold transition-all hover:scale-105 shadow-lg shadow-yellow-400/10"
          >
            Encontrar um GC
          </a>
        </div>
      </header>

      {/* HERO */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <img
          src="https://live.staticflickr.com/65535/55103975739_f1e1c478f7_b.jpg"
          className="absolute inset-0 w-full h-full object-cover"
          alt="Comunidade"
        />
        <div className="absolute inset-0 hero-overlay"></div>
        <div className="section-blur bg-indigo-500 top-[-120px] left-[-120px]"></div>
        <div className="section-blur bg-emerald-500 bottom-[-180px] right-[-180px]"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-32 pb-20">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span className="text-sm text-slate-300">
                Pessoas cuidando de pessoas
              </span>
            </div>

            <h1 className="text-5xl md:text-7xl font-black leading-[0.95] text-white tracking-tight animate-in fade-in slide-in-from-left-4 duration-1000">
              Você não precisa viver a fé <span className="gradient-text">sozinho.</span>
            </h1>

            <p className="text-xl text-slate-300 leading-relaxed mt-8 max-w-2xl animate-in fade-in slide-in-from-left-6 duration-1000 delay-150">
              Os GCs da IBM são lugares onde amizades reais nascem, pessoas são cuidadas
              e a vida acontece além do domingo.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mt-10 animate-in fade-in slide-in-from-bottom-4 duration-1000 delay-300">
              <a 
                href="https://wa.me/5521997558801"
                className="bg-yellow-400 hover:bg-yellow-300 text-slate-950 px-8 py-5 rounded-2xl font-bold text-lg transition-all hover:scale-[1.03] glow text-center"
              >
                Quero conhecer um GC
              </a>
              <a 
                href="#como-funciona"
                className="glass hover:bg-white/10 px-8 py-5 rounded-2xl font-semibold transition-all text-center"
              >
                Como funciona?
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* DOR */}
      <section className="py-32 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 relative z-10">
          <div className="text-center max-w-3xl mx-auto mb-20">
            <span className="text-yellow-400 uppercase tracking-[0.3em] text-sm font-bold">
              Talvez você esteja procurando...
            </span>
            <h2 className="text-4xl md:text-6xl font-black text-white mt-6 leading-tight">
              Um lugar para <span className="gradient-text">pertencer.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: '🤝', title: 'Amigos Reais', desc: 'Pessoas que caminham com você além do culto vivendo uma comunhão profunda — aquilo que a Bíblia chama de koinonia.' },
              { icon: '🙏', title: 'Apoio Espiritual', desc: 'Um ambiente seguro para oração e cuidado.' },
              { icon: '☕', title: 'Vida Compartilhada', desc: 'Conversas leves, cafés, risadas e conexão.' },
              { icon: '🌱', title: 'Crescimento', desc: 'Cresça na fé de forma prática e verdadeira.' }
            ].map((item, i) => (
              <div key={i} className="glass rounded-3xl p-8">
                <div className="text-4xl mb-6">{item.icon}</div>
                <h3 className="text-xl font-bold text-white mb-4">{item.title}</h3>
                <p className="text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* EXPERIÊNCIA */}
      <section id="como-funciona" className="py-32 bg-slate-900/50 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-20 items-center">
            <div>
              <span className="text-emerald-400 uppercase tracking-[0.3em] text-sm font-bold">
                Como funciona?
              </span>
              <h2 className="text-5xl font-black text-white mt-6 leading-tight">
                Mais que uma reunião. <span className="gradient-text">Uma família.</span>
              </h2>
              <p className="text-slate-400 text-lg leading-relaxed mt-8">
                Na IBM, não somos apenas uma igreja com células.<br />
                Somos uma Igreja EM células.<br /><br />
                Acreditamos em uma igreja viva durante a semana, e o GC é o coração do nosso cuidado pastoral.
              </p>

              <div className="space-y-6 mt-10">
                <div className="glass rounded-2xl p-6 transition-colors hover:bg-white/5">
                  <h3 className="text-white font-bold text-xl mb-2">🏠 Reuniões nas casas</h3>
                  <p className="text-slate-400">
                    Louvor, conversa, Bíblia, oração e café em um ambiente leve e acolhedor, sempre às terças-feiras.
                  </p>
                </div>
                <div className="glass rounded-2xl p-6 transition-colors hover:bg-white/5">
                  <h3 className="text-white font-bold text-xl mb-2">📱 Cuidado durante a semana</h3>
                  <p className="text-slate-400">
                    O relacionamento continua no WhatsApp, nas orações e nos momentos da vida.
                  </p>
                </div>
                <div className="glass rounded-2xl p-6 transition-colors hover:bg-white/5">
                  <h3 className="text-white font-bold text-xl mb-2">🚀 De Receptor para Multiplicador</h3>
                  <p className="text-slate-400">
                    Você inicia sua jornada sendo cuidado e amadurece até se tornar alguém que cuida de outros.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative">
              <img
                src="https://live.staticflickr.com/65535/55103975739_f1e1c478f7_b.jpg"
                className="rounded-[32px] shadow-2xl"
                alt="Grupo de amigos"
              />
              <div className="absolute -bottom-8 -left-8 glass p-6 rounded-3xl max-w-xs floating">
                <p className="text-lg leading-relaxed text-white italic">
                  “Aqui, ninguém caminha sozinho.”
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* BAIRROS */}
      <section className="py-28 bg-slate-950 relative overflow-hidden">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <span className="uppercase tracking-[0.3em] text-sm font-bold text-emerald-400">
            Temos um GC perto de você
          </span>
          <h2 className="text-4xl md:text-6xl font-black text-white mt-6 leading-tight">
            GCs espalhados por <span className="gradient-text">São Gonçalo.</span>
          </h2>
          <p className="text-slate-400 text-lg mt-8 max-w-3xl mx-auto leading-relaxed">
            Temos grupos para todas as idades e fases da vida espalhados pela cidade.
          </p>
          <div className="flex flex-wrap justify-center gap-4 mt-16">
            {["ALCÂNTARA", "COLUBANDÊ", "GALO BRANCO", "ITAÚNA", "JARDIM CATARINA", "LARANJAL", "MONJOLOS", "MUTONDO", "MUTUÁ", "PORTO NOVO", "SÃO MIGUEL", "TRINDADE"].map((bairro) => (
              <div key={bairro} className="glass px-5 py-3 rounded-2xl">{bairro}</div>
            ))}
          </div>
          <div className="mt-16 glass rounded-[32px] overflow-hidden shadow-2xl">
            <iframe 
              src="https://gestaoweb.eklesiaonline.com.br/mapas/pgs/Q6Ob"  
              name="iframe-celula" 
              scrolling="no" 
              frameBorder="0" 
              marginHeight={0} 
              marginWidth={0} 
              height="720px" 
              width="100%" 
              allowFullScreen
            ></iframe>
          </div>
        </div>
      </section>

      {/* PASSOS */}
      <section className="py-32 relative overflow-hidden">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-24">
            <span className="text-yellow-400 uppercase tracking-[0.3em] text-sm font-bold">
              É simples começar
            </span>
            <h2 className="text-5xl font-black text-white mt-6">
              Seu próximo passo.
            </h2>
          </div>

          <div className="space-y-8">
            <div className="glass rounded-3xl p-8 flex gap-6 items-start">
              <div className="w-14 h-14 rounded-2xl bg-yellow-400 text-slate-950 font-black flex items-center justify-center text-xl shrink-0">1</div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-3">Chame no WhatsApp</h3>
                <p className="text-slate-400 text-lg">Nossa equipe vai conversar com você e entender sua fase de vida.</p>
              </div>
            </div>
            <div className="glass rounded-3xl p-8 flex gap-6 items-start">
              <div className="w-14 h-14 rounded-2xl bg-emerald-400 text-slate-950 font-black flex items-center justify-center text-xl shrink-0">2</div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-3">Conheça um líder</h3>
                <p className="text-slate-400 text-lg">Você será conectado ao GC ideal para você e sua família.</p>
              </div>
            </div>
            <div className="glass rounded-3xl p-8 flex gap-6 items-start">
              <div className="w-14 h-14 rounded-2xl bg-indigo-400 text-slate-950 font-black flex items-center justify-center text-xl shrink-0">3</div>
              <div>
                <h3 className="text-2xl font-bold text-white mb-3">Faça uma visita</h3>
                <p className="text-slate-400 text-lg">Sem pressão. Sem obrigação. Apenas venha viver a experiência.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="py-32 relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-5xl md:text-7xl font-black text-white leading-[0.95] mb-10">
            Sua vida não foi feita para ser vivida sozinho.
          </h2>
          <p className="text-xl text-slate-400 leading-relaxed">
            Existe um lugar esperando por você.
          </p>
          <a 
            href="https://wa.me/5521997558801"
            className="inline-block mt-12 bg-yellow-400 hover:bg-yellow-300 text-slate-950 px-10 py-6 rounded-2xl font-black text-xl transition-all hover:scale-105 glow shadow-lg shadow-yellow-400/20"
          >
            Quero encontrar meu GC
          </a>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-white/5 py-16 bg-slate-950">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row justify-between gap-10">
            <div>
              <h3 className="text-2xl font-black text-white">Igreja Batista da Manhã</h3>
              <p className="text-slate-500 mt-4 max-w-md">
                Vamos mudar a cidade através do discipulado!
              </p>
            </div>
            <div className="flex gap-8">
              <a href="#" className="text-slate-400 hover:text-white transition">Instagram</a>
              <a href="#" className="text-slate-400 hover:text-white transition">YouTube</a>
              <a href="#" className="text-slate-400 hover:text-white transition">WhatsApp</a>
            </div>
          </div>
          <div className="border-t border-white/5 mt-12 pt-8 text-slate-600 text-sm">
            © {new Date().getFullYear()} Igreja Batista da Manhã — Experiência GC
          </div>
        </div>
      </footer>
    </div>
  );
}
