'use client';

import React from 'react';
import { Logo } from "@/components/icons";

export function PublicFooter() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2 text-white">
            <Logo className="size-6" />
            <span className="text-lg font-bold tracking-tighter">OikoApp</span>
          </div>
          <div className="text-sm text-center md:text-right">
            <p>© {new Date().getFullYear()} Igreja Batista da Manhã.</p>
            <p className="mt-1 italic">Garantindo que a Organização sirva ao Organismo.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
