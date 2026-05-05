import Link from 'next/link';
import Image from 'next/image';
import { Network, TrendingUp, Users, HeartHandshake, Music, BookOpen, Coffee, ChevronDown } from 'lucide-react';

export const metadata = {
  title: 'Experiência GC | Igreja Batista da Manhã',
  description: 'Você não foi feito para caminhar sozinho. Encontre seu Grupo de Crescimento.',
};

export default function GCPage() {
  return (
    <div className="font-body text-slate-100 selection:bg-indigo-500/30 bg-[#0b1326] min-h-screen relative">
      <style dangerouslySetInnerHTML={{
        __html: `
          .glass-card {
              background: rgba(23, 31, 51, 0.7);
              backdrop-filter: blur(12px);
              border: 1px solid rgba(145, 143, 161, 0.2);
          }
          .glow-indigo {
              box-shadow: 0 0 40px -10px rgba(79, 70, 229, 0.3);
          }
          .glow-emerald {
              box-shadow: 0 0 40px -10px rgba(78, 222, 163, 0.2);
          }
        `
      }} />

      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-[#0b1326]/80 backdrop-blur-xl border-b border-slate-800 shadow-xl">
        <div className="flex justify-between items-center px-6 py-4 max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-2">
            <Network className="text-indigo-400 size-6" />
            <span className="text-xl font-extrabold tracking-tighter text-white font-headline">Experiência GC IBM</span>
          </div>
          <Link href="/login" className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-semibold text-sm hover:bg-indigo-700 transition-all duration-300 active:scale-95">
            Participar
          </Link>
        </div>
      </header>

      <main className="pt-20">
        {/* Hero Section */}
        <section className="relative min-h-[795px] flex items-center px-6 py-16 overflow-hidden">
          <div className="absolute inset-0 z-0">
            <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full"></div>
            <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/10 blur-[120px] rounded-full"></div>
            <img 
              className="w-full h-full object-cover opacity-30 grayscale-[20%]" 
              alt="Background GC" 
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuD8In4CqDZgiltHLDAcDoi8IxZyKR2xAr1hnDPTJYMInPiQyhJ7AevQsxdNM3nunQnNKN16syR_nXhhWRIwJW0jUyjoDVyh9VDGIzKBZME1OhXA-4vyXfuZufVNUg7gy_kAT1Bj4QIe5_Rfh4E6uTPNNak6PT5_B9Pew9odQT_o8OTGHkaSPIqJc1aE5n1hQ9Sdt_lOP59-evmXMiHGdOEIJyMlNWZRuk0G2-1nbIT4GNf2rQyrWnJXMy2Ms7xFYaQBZ9F-iQ1IxnU"
            />
          </div>
          <div className="relative z-10 max-w-lg mx-auto text-center space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2d3449] border border-slate-700">
              <TrendingUp className="text-emerald-400 size-4" />
              <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Visão 2026: Crescimento Saudável</span>
            </div>
            <h1 className="font-headline text-5xl md:text-6xl font-extrabold text-white leading-tight tracking-tight">
              Você não foi feito para caminhar sozinho
            </h1>
            <p className="text-lg text-slate-300 leading-relaxed">
              Encontre sua família fora do templo. O GC é o lugar onde a vida acontece além do domingo.
            </p>
            <div className="pt-4">
              <Link href="#como-funciona" className="inline-block w-full sm:w-auto bg-indigo-600 text-white px-8 py-4 rounded-xl font-semibold shadow-lg shadow-indigo-600/30 transition-transform hover:bg-indigo-500 active:scale-95">
                Encontrar meu grupo agora
              </Link>
            </div>
          </div>
        </section>

        {/* O que é um GC? */}
        <section className="px-6 py-20 bg-[#060e20]" id="sobre">
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div className="space-y-6">
              <h2 className="font-headline text-3xl font-bold text-white">O que é um GC?</h2>
              <p className="text-base text-slate-300 leading-relaxed">
                Muito mais que uma reunião, o <span className="text-indigo-400 font-bold">Grupo de Crescimento</span> é a nossa expressão de "vida em comum" (Koinonia). Somos pequenos grupos de amigos que se reúnem semanalmente para compartilhar a vida, orar uns pelos outros e amadurecer na fé.
              </p>
              <div className="p-6 glass-card rounded-xl border-l-4 border-emerald-400">
                <p className="text-sm font-bold text-emerald-400">IBM: Uma Igreja EM Células</p>
                <p className="text-base text-slate-200 italic mt-1">Cuidado descentralizado para que ninguém se sinta invisível.</p>
              </div>
            </div>
            <div className="relative rounded-2xl overflow-hidden aspect-square glow-indigo">
              <img 
                className="w-full h-full object-cover" 
                alt="GC Meeting" 
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuDG2oHBZMMJGUzg4er1lKb19BUXFQQ9PlSIdCRPkx1JkL3w5r1yCOOvD9NayziSfwkY3oLlSZkX5N2KCJwCBnaIqkLrV5Ph5CiKJImEwGVEC3W1sYCqM1tAiFyf5RMDLwtvx1UeexxgWrqUqDlFKuhl-5Y2WjidX7KZbqGmNZ5dyPNY532MzylGRfiNw69h40htH6spfNbw6QQgZfBAtmn2f6YGTkLk0XSi-F2Rut8ms6NJIbnMUrTZqUWMIlOF0w2GX22SmG4Hpx8"
              />
            </div>
          </div>
        </section>

        {/* Por que participar? */}
        <section className="px-6 py-20 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full max-w-4xl bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none"></div>
          <div className="max-w-screen-xl mx-auto text-center mb-16 relative z-10">
            <h2 className="font-headline text-3xl font-bold text-white">Por que participar?</h2>
            <p className="text-slate-300 text-base mt-3">A transição do Consumidor para o Abençoador começa aqui.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto relative z-10">
            {/* Card 1 */}
            <div className="glass-card p-10 rounded-2xl space-y-4 hover:border-indigo-400/50 transition-colors duration-300">
              <div className="w-12 h-12 rounded-lg bg-indigo-600/20 flex items-center justify-center">
                <Users className="text-indigo-400 size-6" />
              </div>
              <h3 className="font-headline text-xl font-bold text-white">Pertencimento</h3>
              <p className="text-base text-slate-300">Na IBM, ninguém é apenas um número. No GC, você tem nome e história.</p>
            </div>
            {/* Card 2 */}
            <div className="glass-card p-10 rounded-2xl space-y-4 hover:border-emerald-400/50 transition-colors duration-300">
              <div className="w-12 h-12 rounded-lg bg-emerald-600/20 flex items-center justify-center">
                <HeartHandshake className="text-emerald-400 size-6" />
              </div>
              <h3 className="font-headline text-xl font-bold text-white">Apoio Mútuo</h3>
              <p className="text-base text-slate-300">Ter alguém para ligar num momento de crise ou celebrar uma vitória marcante.</p>
            </div>
            {/* Card 3 */}
            <div className="glass-card p-10 rounded-2xl space-y-4 hover:border-rose-400/50 transition-colors duration-300">
              <div className="w-12 h-12 rounded-lg bg-rose-600/20 flex items-center justify-center">
                <TrendingUp className="text-rose-400 size-6" />
              </div>
              <h3 className="font-headline text-xl font-bold text-white">Crescimento</h3>
              <p className="text-base text-slate-300">Descobrir e usar seus talentos. Saia da posição de consumidor para se tornar um Catalisador.</p>
            </div>
          </div>
        </section>

        {/* Como funciona */}
        <section className="px-6 py-20 bg-[#171f33]" id="como-funciona">
          <div className="max-w-4xl mx-auto space-y-16">
            <div className="text-center">
              <h2 className="font-headline text-3xl font-bold text-white">Dinâmica 24/7</h2>
              <p className="text-slate-300 mt-2">O cuidado não acontece só em um dia.</p>
            </div>
            
            <div className="relative p-10 rounded-3xl bg-[#2d3449] border border-slate-700/50 overflow-hidden">
              <div className="flex flex-col gap-10 md:flex-row md:items-center">
                <div className="flex-1 space-y-6">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_10px_#4edea3]"></span>
                    <span className="text-sm font-bold text-emerald-400">Encontro Semanal (1h30)</span>
                  </div>
                  <ul className="space-y-4 text-base text-slate-300">
                    <li className="flex items-center gap-3"><Music className="text-indigo-400 size-5" /> Louvor e Adoração</li>
                    <li className="flex items-center gap-3"><BookOpen className="text-indigo-400 size-5" /> Estudo Bíblico Aplicado</li>
                    <li className="flex items-center gap-3"><Coffee className="text-indigo-400 size-5" /> Coffee Break e Comunhão</li>
                  </ul>
                </div>
                <div className="flex-1 bg-[#131b2e] p-6 rounded-xl border border-slate-700/50">
                  <p className="text-sm font-bold text-white mb-2">Cuidado Diário</p>
                  <p className="text-base text-slate-300">Acompanhamento via mensagens, oração em tempo real e a construção de amizades improváveis que duram para sempre.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Como participar (Steps) */}
        <section className="px-6 py-20">
          <div className="max-w-3xl mx-auto">
            <h2 className="font-headline text-3xl font-bold text-white text-center mb-16">Sua Jornada em 3 Passos</h2>
            <div className="space-y-6">
              {/* Step 1 */}
              <div className="flex gap-6 group">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">1</div>
                  <div className="w-px h-full bg-slate-700 mt-2"></div>
                </div>
                <div className="pb-10">
                  <h4 className="font-headline text-xl font-bold text-white">Escolha por afinidade</h4>
                  <p className="text-slate-300 mt-2">Nossas Redes são segmentadas: <span className="text-indigo-400 font-semibold">Gleed</span> (Jovens), <span className="text-indigo-400 font-semibold">Delas</span> (Mulheres), <span className="text-indigo-400 font-semibold">Twogether</span> (Casais), e mais.</p>
                </div>
              </div>
              {/* Step 2 */}
              <div className="flex gap-6 group">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold">2</div>
                  <div className="w-px h-full bg-slate-700 mt-2"></div>
                </div>
                <div className="pb-10">
                  <h4 className="font-headline text-xl font-bold text-white">Receba contato</h4>
                  <p className="text-slate-300 mt-2">Em até 48h um líder facilitador entrará em contato para te dar as boas-vindas e passar o endereço.</p>
                </div>
              </div>
              {/* Step 3 */}
              <div className="flex gap-6 group">
                <div className="flex flex-col items-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold">3</div>
                </div>
                <div>
                  <h4 className="font-headline text-xl font-bold text-white">Faça uma visita</h4>
                  <p className="text-slate-300 mt-2">Participe sem compromisso. Sinta a atmosfera da Cultura S.E.R.V.I.R. na prática.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="px-6 py-20 bg-[#131b2e]">
          <div className="max-w-3xl mx-auto space-y-10">
            <h2 className="font-headline text-3xl font-bold text-white text-center">Dúvidas Frequentes</h2>
            <div className="space-y-4">
              <details className="group glass-card rounded-xl">
                <summary className="list-none p-6 flex justify-between items-center cursor-pointer">
                  <span className="text-sm font-bold text-white">Preciso ser membro da IBM?</span>
                  <ChevronDown className="text-slate-400 transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-6 pb-6 text-slate-300 text-base border-t border-slate-700/50 pt-4">
                  Não. O GC é a porta de entrada. Todos são bem-vindos, independente de onde estejam em sua jornada espiritual.
                </div>
              </details>
              <details className="group glass-card rounded-xl">
                <summary className="list-none p-6 flex justify-between items-center cursor-pointer">
                  <span className="text-sm font-bold text-white">Tem para a minha idade?</span>
                  <ChevronDown className="text-slate-400 transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-6 pb-6 text-slate-300 text-base border-t border-slate-700/50 pt-4">
                  Sim! Temos grupos desde adolescentes até a terceira idade, com perfis variados para que você se sinta em casa.
                </div>
              </details>
              <details className="group glass-card rounded-xl">
                <summary className="list-none p-6 flex justify-between items-center cursor-pointer">
                  <span className="text-sm font-bold text-white">Posso levar amigos?</span>
                  <ChevronDown className="text-slate-400 transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-6 pb-6 text-slate-300 text-base border-t border-slate-700/50 pt-4">
                  Com certeza! O GC é um ambiente de hospitalidade. Amigos e familiares são sempre convidados de honra.
                </div>
              </details>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="px-6 py-20 text-center">
          <div className="max-w-md mx-auto p-12 rounded-3xl bg-gradient-to-br from-indigo-900/50 to-emerald-900/50 border border-slate-700 glow-indigo">
            <h2 className="font-headline text-3xl font-bold text-white mb-6">Pronto para começar?</h2>
            <p className="text-base text-slate-300 mb-10">A cultura do Zelo e Excelência te espera em um de nossos grupos.</p>
            <Link href="/login" className="block w-full bg-white text-slate-900 px-10 py-4 rounded-xl font-bold active:scale-95 transition-transform hover:bg-slate-100">
              Encontrar um GC
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-slate-800 bg-[#060e20]">
        <div className="max-w-7xl mx-auto px-6 py-12 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <span className="text-lg font-bold text-slate-200 font-headline">Experiência GC IBM</span>
            <span className="font-body text-sm text-slate-400">© 2024 Experiência GC IBM. Cultura S.E.R.V.I.R.</span>
          </div>
          <nav className="flex flex-wrap justify-center gap-6">
            <Link className="text-slate-500 hover:text-emerald-400 transition-colors duration-200 text-sm" href="#">Sobre</Link>
            <Link className="text-slate-500 hover:text-emerald-400 transition-colors duration-200 text-sm" href="#">Benefícios</Link>
            <Link className="text-slate-500 hover:text-emerald-400 transition-colors duration-200 text-sm" href="#">FAQ</Link>
            <Link className="text-slate-500 hover:text-emerald-400 transition-colors duration-200 text-sm" href="#">Contato</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
