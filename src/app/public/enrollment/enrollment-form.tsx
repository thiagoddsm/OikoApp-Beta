
'use client';

import React, { useState, useMemo } from 'react';
import { useVolunteering } from '@/contexts/volunteering-context';
import { useFirebase, addDocumentNonBlocking } from '@/firebase';
import { collection, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Send, CheckCircle, Info, Sparkles, User, MapPin, Clock } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export function EnrollmentForm({ course, onCancel }: { course: any, onCancel: () => void }) {
    const { classes, addUser, isLoading } = useVolunteering();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    
    const [step, setStep] = useState(1);
    const [isSaving, setIsSaving] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        cpf: '',
        sexo: '',
        dataNascimento: '',
        classId: '',
    });

    const courseClasses = useMemo(() => classes.filter(c => c.courseId === course.id), [classes, course]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (name: string, value: string) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!firestore) return;
        
        setIsSaving(true);
        try {
            // 1. Criar pré-cadastro do usuário (Cidade)
            const userId = await addUser({
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                cpf: formData.cpf,
                sexo: formData.sexo,
                dataNascimento: formData.dataNascimento,
                integrationStatus: 'nao_alcancado',
            });

            // 2. Criar solicitação de matrícula
            await addDocumentNonBlocking(collection(firestore, 'enrollment_requests'), {
                userId,
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                courseId: course.id,
                classId: formData.classId,
                status: 'pending',
                createdAt: Timestamp.now(),
            });

            setIsSuccess(true);
            toast({ title: 'Solicitação Recebida!', description: 'Nossa equipe entrará em contato em breve.' });
        } catch (error) {
            console.error(error);
            toast({ variant: 'destructive', title: 'Erro ao processar', description: 'Por favor, tente novamente mais tarde.' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isSuccess) {
        return (
            <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden animate-in zoom-in-95 duration-500">
                <div className="bg-emerald-600 p-12 text-center text-white">
                    <div className="size-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                        <CheckCircle size={40} />
                    </div>
                    <h2 className="text-3xl font-black italic tracking-tighter mb-2">Quase lá, {formData.name.split(' ')[0]}!</h2>
                    <p className="text-emerald-50 opacity-90 max-w-md mx-auto">Sua solicitação para o curso <strong>{course.name}</strong> foi recebida com sucesso. Fique atento ao seu WhatsApp!</p>
                </div>
                <CardContent className="p-12 text-center space-y-6">
                    <p className="text-slate-600 text-sm leading-relaxed">
                        Nossa equipe pedagógica analisará sua solicitação e realizará a matrícula oficial na turma selecionada. Você receberá uma confirmação automática assim que o processo for concluído.
                    </p>
                    <Button onClick={onCancel} className="rounded-full px-10 h-12 font-black uppercase text-xs tracking-widest">
                        Voltar ao Início
                    </Button>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-none shadow-2xl rounded-[2.5rem] bg-white overflow-hidden">
            <div className="bg-slate-900 p-8 sm:p-12 text-white relative">
                <div className="absolute top-4 right-8 opacity-10"><Sparkles size={80} /></div>
                <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5 font-black uppercase text-[10px] mb-4">Inscrição Lumine</Badge>
                <h2 className="text-3xl sm:text-4xl font-black italic tracking-tighter leading-none mb-2">{course.name}</h2>
                <p className="text-slate-400 text-sm sm:text-base font-medium">{course.ministryName} • Matrícula Temporada 2025</p>
            </div>

            <form onSubmit={handleSubmit}>
                <CardContent className="p-8 sm:p-12 space-y-8">
                    {/* Progress indicator */}
                    <div className="flex gap-2">
                        <div className={cn("h-1.5 flex-1 rounded-full transition-all duration-500", step >= 1 ? "bg-primary" : "bg-slate-100")} />
                        <div className={cn("h-1.5 flex-1 rounded-full transition-all duration-500", step >= 2 ? "bg-primary" : "bg-slate-100")} />
                    </div>

                    {step === 1 ? (
                        <div className="space-y-6 animate-in slide-in-from-right-4">
                            <div className="flex items-center gap-2 text-primary font-black uppercase text-xs tracking-widest">
                                <User className="size-4" /> 1. Seus Dados
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Nome Completo</Label>
                                    <Input name="name" required value={formData.name} onChange={handleInputChange} placeholder="Como deseja ser chamado?" className="h-12" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">WhatsApp (DDD)</Label>
                                    <Input name="phone" required type="tel" value={formData.phone} onChange={handleInputChange} placeholder="(21) 9..." className="h-12" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">E-mail</Label>
                                    <Input name="email" type="email" value={formData.email} onChange={handleInputChange} placeholder="seu@email.com" className="h-12" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">CPF</Label>
                                    <Input name="cpf" required value={formData.cpf} onChange={handleInputChange} placeholder="000.000.000-00" className="h-12" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Data de Nascimento</Label>
                                    <Input name="dataNascimento" required type="date" value={formData.dataNascimento} onChange={handleInputChange} className="h-12" />
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Sexo</Label>
                                    <RadioGroup value={formData.sexo} onValueChange={(v) => handleSelectChange('sexo', v)} className="flex gap-6 h-12 items-center px-2">
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="Masculino" id="s-m" /><Label htmlFor="s-m" className="font-bold">Masc.</Label></div>
                                        <div className="flex items-center space-x-2"><RadioGroupItem value="Feminino" id="s-f" /><Label htmlFor="s-f" className="font-bold">Fem.</Label></div>
                                    </RadioGroup>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in slide-in-from-right-4">
                            <div className="flex items-center gap-2 text-primary font-black uppercase text-xs tracking-widest">
                                <Clock className="size-4" /> 2. Escolha da Turma
                            </div>
                            <div className="space-y-4">
                                <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Selecione o Horário Disponível</Label>
                                <div className="grid grid-cols-1 gap-3">
                                    {courseClasses.length === 0 ? (
                                        <div className="p-8 border-2 border-dashed rounded-2xl text-center text-slate-400">
                                            <Info className="size-8 mx-auto mb-2 opacity-20" />
                                            Nenhuma turma aberta para inscrição online no momento.<br/>Faremos o agendamento após o seu cadastro.
                                        </div>
                                    ) : (
                                        courseClasses.map(cls => (
                                            <button
                                                key={cls.id}
                                                type="button"
                                                onClick={() => setFormData(p => ({...p, classId: cls.id}))}
                                                className={cn(
                                                    "p-4 border-2 rounded-2xl text-left transition-all flex items-center justify-between group",
                                                    formData.classId === cls.id ? "border-primary bg-primary/5 shadow-inner" : "bg-slate-50 hover:bg-white hover:border-slate-300"
                                                )}
                                            >
                                                <div>
                                                    <p className="font-black text-slate-900 uppercase tracking-tight">{cls.name}</p>
                                                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground font-medium">
                                                        <span className="flex items-center gap-1"><Clock size={12}/> {cls.dayOfWeek} às {cls.startTime}</span>
                                                        <span className="flex items-center gap-1"><MapPin size={12}/> {cls.locationId === 'the_school' ? 'The School' : 'Templo Sede'}</span>
                                                    </div>
                                                </div>
                                                <div className={cn("size-6 rounded-full border-2 flex items-center justify-center transition-all", formData.classId === cls.id ? "bg-primary border-primary text-white" : "border-slate-300 group-hover:border-primary")}>
                                                    {formData.classId === cls.id && <CheckCircle size={14} />}
                                                </div>
                                            </button>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>

                <CardFooter className="p-8 sm:p-12 bg-slate-50 border-t flex flex-col sm:flex-row justify-between gap-4">
                    <Button type="button" variant="ghost" onClick={onCancel} className="font-bold">Cancelar</Button>
                    <div className="flex gap-2 w-full sm:w-auto">
                        {step === 2 && (
                            <Button type="button" variant="outline" onClick={() => setStep(1)} className="font-bold flex-1 sm:flex-none">Voltar</Button>
                        )}
                        <Button 
                            type={step === 2 ? "submit" : "button"} 
                            onClick={step === 1 ? () => setStep(2) : undefined}
                            disabled={isSaving || (step === 1 && !formData.name) || (step === 2 && courseClasses.length > 0 && !formData.classId)}
                            className="font-black uppercase text-xs tracking-widest h-12 px-8 flex-1 sm:flex-none shadow-xl shadow-primary/20"
                        >
                            {isSaving ? <Loader2 className="animate-spin size-4" /> : step === 1 ? "Próximo Passo" : "Confirmar Inscrição"}
                        </Button>
                    </div>
                </CardFooter>
            </form>
        </Card>
    );
}
