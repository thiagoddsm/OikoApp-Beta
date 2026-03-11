'use client';

import { Logo } from '@/components/icons';

export function PublicFooter() {
  return (
    <footer className="border-t bg-muted/30 py-12">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <Logo className="size-6 text-primary" />
            <span className="font-bold">OikoApp</span>
          </div>
          <p className="text-sm text-muted-foreground text-center">
            © {new Date().getFullYear()} Igreja Batista da Manhã. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
