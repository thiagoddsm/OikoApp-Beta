'use client';
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { BookOpen, Calendar, CheckSquare, PlusCircle, RefreshCw, Sparkles, UserCheck, HelpCircle } from 'lucide-react';

export function TeachingTutorialTab() {
    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h3 className="text-xl font-black uppercase tracking-tighter text-primary flex items-center gap-2">
                    <HelpCircle className="size-5" /> Manual de Uso do Ensino
                </h3>
                <p className="text-xs text-muted-foreground font-medium">Guia passo a passo para a equipe gerenciar turmas, presenças e cronogramas.</p>
            </div>

            <Accordion type="single" collapsible className="w-full space-y-3">
                
                {/* 1. Criar Turma / Ciclo */}
                <AccordionItem value="item-1" className="border rounded-xl px-4 bg-white shadow-sm">
                    <AccordionTrigger className="hover:no-underline font-bold text-slate-800 py-4 flex items-center gap-2">
                        <PlusCircle className="size-5 text-primary shrink-0" />
                        <span>1. Como Criar Turma ou Ciclo de Aulas?</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-slate-600 leading-relaxed space-y-3 pb-4">
                        <p>No painel do curso desejado:</p>
                        <ol className="list-decimal pl-5 space-y-1">
                            <li>Acesse a aba <strong>Turmas</strong>.</li>
                            <li>Clique no botão <strong>Nova Turma</strong> no canto direito.</li>
                            <li><strong>Modo de Criação:</strong>
                                <ul className="list-disc pl-5 mt-1 space-y-1">
                                    <li><strong>Turma Única:</strong> Cria apenas uma turma com dia, hora e professor fixos (ex: Domingo às 09:00).</li>
                                    <li><strong>Criação em Ciclo:</strong> Permite criar várias turmas conectadas a um mesmo período escolar, definindo a ementa de aulas compartilhada entre elas.</li>
                                </ul>
                            </li>
                            <li>Defina a <strong>Data de Início</strong> (e opcionalmente a Data Limite de Inscrição para trancar matrículas automaticamente após certa data).</li>
                            <li>Defina a periodicidade (pontual, semanal, quinzenal ou mensal).</li>
                            <li>Clique em <strong>Salvar</strong> para gerar o cronograma inicial com base nos encontros.</li>
                        </ol>
                    </AccordionContent>
                </AccordionItem>

                {/* 2. Dar Presença */}
                <AccordionItem value="item-2" className="border rounded-xl px-4 bg-white shadow-sm">
                    <AccordionTrigger className="hover:no-underline font-bold text-slate-800 py-4 flex items-center gap-2">
                        <UserCheck className="size-5 text-primary shrink-0" />
                        <span>2. Como Registrar Frequência (Dar Presença)?</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-slate-600 leading-relaxed space-y-3 pb-4">
                        <p>Para dar presença nas aulas ocorridas:</p>
                        <ol className="list-decimal pl-5 space-y-1">
                            <li>Entre na turma desejada e clique na aba <strong>Frequência</strong> ou acesse a coluna da data correspondente.</li>
                            <li>Você verá a listagem de todos os alunos matriculados.</li>
                            <li>Marque a opção correspondente ao aluno na data da aula:
                                <ul className="list-disc pl-5 mt-1 space-y-1">
                                    <li><strong>Presente:</strong> O aluno assistiu à aula no horário regular.</li>
                                    <li><strong>Online:</strong> Assistiu à aula remotamente (se aplicável).</li>
                                    <li><strong>Falta (Em branco):</strong> Se não compareceu.</li>
                                </ul>
                            </li>
                            <li>As alterações de presença salvam automaticamente no Firestore de forma não bloqueante.</li>
                        </ol>
                    </AccordionContent>
                </AccordionItem>

                {/* 3. Mudar Nome do Módulo ou Ementa */}
                <AccordionItem value="item-3" className="border rounded-xl px-4 bg-white shadow-sm">
                    <AccordionTrigger className="hover:no-underline font-bold text-slate-800 py-4 flex items-center gap-2">
                        <BookOpen className="size-5 text-primary shrink-0" />
                        <span>3. Como Mudar o Nome do Módulo ou Detalhes da Ementa?</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-slate-600 leading-relaxed space-y-3 pb-4">
                        <p>O conteúdo das aulas de uma turma é herdado da <strong>Ementa Geral do Curso</strong>:</p>
                        <ol className="list-decimal pl-5 space-y-1">
                            <li>No painel principal do Curso, clique na aba <strong>Ementa</strong>.</li>
                            <li>Aqui você verá a lista de todos os módulos/aulas.</li>
                            <li>Você pode:
                                <ul className="list-disc pl-5 mt-1 space-y-1">
                                    <li>Editar o título, a descrição e o ID do vídeo do Theoflix associado.</li>
                                    <li>Reordenar os módulos arrastando-os ou clicando nas setas.</li>
                                    <li>Adicionar novas aulas à ementa (por exemplo, adicionar a 12ª aula).</li>
                                </ul>
                            </li>
                            <li><em>Nota:</em> Se você adicionar novas aulas na ementa, lembre-se de ajustar a <strong>Data de Término</strong> da turma ou a recorrência para que o sistema gere datas suficientes para comportar todas as novas aulas.</li>
                        </ol>
                    </AccordionContent>
                </AccordionItem>

                {/* 4. Adiar ou Mudar Data de uma Aula */}
                <AccordionItem value="item-4" className="border rounded-xl px-4 bg-white shadow-sm">
                    <AccordionTrigger className="hover:no-underline font-bold text-slate-800 py-4 flex items-center gap-2">
                        <Calendar className="size-5 text-primary shrink-0" />
                        <span>4. Como Adiar, Adiantar ou Mudar a Data de uma Aula?</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-slate-600 leading-relaxed space-y-3 pb-4">
                        <p>Se um feriado ou imprevisto alterar a data de uma aula específica de uma turma:</p>
                        <ol className="list-decimal pl-5 space-y-1">
                            <li>Entre na turma e vá na aba <strong>Planejamento de Aulas</strong>.</li>
                            <li>Localize o card da aula desejada.</li>
                            <li>Clique no link azul <strong>Alterar Data</strong> na coluna da esquerda do card da aula.</li>
                            <li>Escolha a nova data no calendário que irá se abrir.</li>
                            <li>O sistema criará automaticamente um *desvio (override)* movendo o tema daquela aula para a nova data sem quebrar a ordem das demais aulas regulares.</li>
                        </ol>
                    </AccordionContent>
                </AccordionItem>

                {/* 5. Cancelar Dia sem Aula (Adiar) */}
                <AccordionItem value="item-5" className="border rounded-xl px-4 bg-white shadow-sm">
                    <AccordionTrigger className="hover:no-underline font-bold text-slate-800 py-4 flex items-center gap-2">
                        <Sparkles className="size-5 text-primary shrink-0" />
                        <span>5. Como Cancelar uma Data Específica (Dia Sem Aula)?</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-slate-600 leading-relaxed space-y-3 pb-4">
                        <p>Para desmarcar um encontro em data específica (ex: feriado nacional):</p>
                        <ol className="list-decimal pl-5 space-y-1">
                            <li>Na aba <strong>Planejamento de Aulas</strong>, localize a aula que cai no feriado.</li>
                            <li>Clique no botão **X** (Cancelar Aula) no menu de ações do card correspondente.</li>
                            <li>A aula ficará com a cor vermelha e riscada. As aulas seguintes do cronograma regular serão automaticamente empurradas para as próximas ocorrências normais, garantindo que o tema não seja perdido.</li>
                        </ol>
                    </AccordionContent>
                </AccordionItem>

                {/* 6. Aulas Extras e Reposições */}
                <AccordionItem value="item-6" className="border rounded-xl px-4 bg-white shadow-sm">
                    <AccordionTrigger className="hover:no-underline font-bold text-slate-800 py-4 flex items-center gap-2">
                        <RefreshCw className="size-5 text-primary shrink-0" />
                        <span>6. Aulas Extras e Reposições</span>
                    </AccordionTrigger>
                    <AccordionContent className="text-sm text-slate-600 leading-relaxed space-y-3 pb-4">
                        <p><strong>Criar Aula Extra:</strong></p>
                        <p className="mb-2">Para adicionar uma aula especial em dia diferente da grade regular da turma:</p>
                        <ol className="list-decimal pl-5 space-y-2">
                            <li>Na aba <strong>Planejamento de Aulas</strong>, clique no botão azul <strong>Mudar Data</strong> em uma aula padrão e arraste-a para um dia atípico.</li>
                            <li>Você pode configurar horários de reposição no Firestore cadastrando ocorrências extras.</li>
                        </ol>
                        <p><strong>Lançar Presença de Reposição:</strong></p>
                        <ol className="list-decimal pl-5 space-y-1">
                            <li>Quando um aluno assiste ao conteúdo de uma aula que ele perdeu em outra turma ou via Theoflix, acesse a aba <strong>Frequência</strong>.</li>
                            <li>Clique no botão de opções ao lado do nome do aluno e selecione <strong>Marcar Reposição</strong>.</li>
                            <li>Aponte em qual turma ou vídeo do Theoflix ele realizou a reposição para reverter a falta em aprovação automaticamente.</li>
                        </ol>
                    </AccordionContent>
                </AccordionItem>

            </Accordion>
        </div>
    );
}
