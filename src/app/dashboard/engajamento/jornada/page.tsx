import { JourneyKanban } from '@/domains/engagement/components/JourneyKanban';

export default function JornadaPage() {
  return (
    <div className="p-8 max-w-[1600px] mx-auto flex flex-col gap-8 h-screen">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Jornada de Engajamento</h1>
        <p className="text-muted-foreground">
          Acompanhe a evolução dos membros através do pipeline ministerial da igreja.
        </p>
      </div>

      <div className="flex-1 min-h-0">
        <JourneyKanban />
      </div>
    </div>
  );
}
