import React from 'react';

export function PublicFooter() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
      <div className="container mx-auto px-4 text-center">
        <p className="text-xs uppercase font-black tracking-widest">© {new Date().getFullYear()} OikoApp - Igreja Batista da Manhã.</p>
        <p className="text-[10px] mt-2 opacity-50">Todos os direitos reservados.</p>
      </div>
    </footer>
  );
}
