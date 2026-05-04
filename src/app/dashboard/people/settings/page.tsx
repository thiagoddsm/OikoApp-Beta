'use client';

import { JourneySettingsManager } from '@/components/people/journey-settings-manager';
import { MergeUsersManager } from '@/components/people/merge-users-manager';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { VolunteeringProvider } from '@/contexts/volunteering-context';

export default function PeopleSettingsPage() {
    return (
        <VolunteeringProvider>
            <Card className="border-none shadow-none bg-transparent">
                <CardHeader className="px-0">
                    <CardTitle className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">
                        Configurações de Pessoas
                    </CardTitle>
                    <CardDescription>
                        Gerencie configurações globais, unifique duplicatas e personalize a jornada do membro.
                    </CardDescription>
                </CardHeader>
                <CardContent className="px-0">
                    <Tabs defaultValue="journey" className="w-full">
                        <TabsList className="mb-6 bg-white border p-1 rounded-xl h-auto">
                            <TabsTrigger value="journey" className="rounded-lg font-bold uppercase text-[10px] tracking-widest px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                Jornada do Membro
                            </TabsTrigger>
                            <TabsTrigger value="merge" className="rounded-lg font-bold uppercase text-[10px] tracking-widest px-4 py-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                                Unificar Cadastros
                            </TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="journey" className="mt-0 outline-none">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Configurações da Jornada do Membro</CardTitle>
                                    <CardDescription>
                                        Gerencie as etapas da trilha de discipulado, personalize os checklists e defina os detalhes de cada fase.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <JourneySettingsManager />
                                </CardContent>
                            </Card>
                        </TabsContent>
                        
                        <TabsContent value="merge" className="mt-0 outline-none">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Assistente de Unificação (Deep Merge)</CardTitle>
                                    <CardDescription>
                                        Encontre cadastros duplicados e faça a unificação inteligente sem perder o histórico.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <MergeUsersManager />
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </VolunteeringProvider>
    );
}
