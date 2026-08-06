
'use client';

import React, { useState, useMemo } from 'react';
import { useVolunteering } from '@/contexts/volunteering-context';
import { useFirebase } from '@/firebase';
import { addDoc, collection } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { 
    Loader2, 
    CheckCircle, 
    BookOpen, 
    User, 
    Mail, 
    Phone, 
    ArrowRight, 
    ArrowLeft,
    Clock,
    School
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useCoursesData } from "@/hooks/useDomainData";

export function EnrollmentForm({ initialCourseId }: { initialCourseId?: string }) {
    const { courses, classes, enrollmentRequests, pedagogicalLogs, theoflixCourses } = useCoursesData();

    const { isLoading } = useVolunteering();
    const { firestore } = useFirebase();
    const { toast } = useToast();
    
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        cpf: '',
        courseId: initialCourseId || '',
        classId: '',
    });

    const selectedCourse = useMemo(() => 
        courses.find(c => c.id === formData.courseId),
    [courses, formData.courseId]);

    const availableClasses = useMemo(() => 
        classes.filter(cls => cls.courseId === formData.courseId),
    [classes, formData.courseId]);

    const [paymentChoice, setPaymentChoice] = useState<'pix' | 'credit_card'>('pix');
    const [selectedInstallments, setSelectedInstallments] = useState<number>(1);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectCourse = (id: string) => {
        setFormData(prev => ({ ...prev, courseId: id, classId: '' }));
        setStep(2);
    };

    // Configuração financeira do curso selecionado
    const finConfig = (selectedCourse as any)?.financeConfig;
    const isCoursePaid = finConfig?.isPaid ?? true;
    const baseTotalAmount = finConfig?.totalAmount ? Number(finConfig.totalAmount) : 100;
    const maxInstallments = finConfig?.installments ? Number(finConfig.installments) : 1;

    // Cálculo com repasse de juros no cartão (taxa padrão de 2.99% a.m. repassada ao cliente)
    const cardInterestRateMonthly = 0.0299;
    const calculateCardInstallments = (count: number) => {
        if (count <= 1) return { perInstallment: baseTotalAmount, total: baseTotalAmount };
        // Fator de juros compostos repassados
        const totalWithInterest = baseTotalAmount * Math.pow(1 + cardInterestRateMonthly, count);
        return {
            perInstallment: totalWithInterest / count,
            total: totalWithInterest
        };
    };

    const handleSubmit = async () => {
        if (!formData.name || !formData.email || !formData.phone || !formData.courseId) {
            toast({ variant: 'destructive', title: 'Campos obrigatórios', description: 'Por favor, preencha todos os seus dados.' });
            return;
        }

        if (isCoursePaid && !formData.cpf.trim()) {
            toast({ variant: 'destructive', title: 'CPF Obrigatório', description: 'Por favor, informe seu CPF para gerar a fatura.' });
            setStep(3);
            return;
        }

        setIsSubmitting(true);
        try {
            const cardCalc = calculateCardInstallments(selectedInstallments);

            await addDoc(collection(firestore!, 'enrollment_requests'), {
                name: formData.name,
                email: formData.email,
                phone: formData.phone,
                cpf: formData.cpf.replace(/\D/g, ''),
                courseId: formData.courseId,
                classId: formData.classId,
                status: 'pending',
                paymentInfo: {
                    type: paymentChoice,
                    installments: paymentChoice === 'credit_card' ? selectedInstallments : 1,
                    totalValue: paymentChoice === 'credit_card' ? cardCalc.total : baseTotalAmount,
                    passedInterestToCustomer: paymentChoice === 'credit_card' && selectedInstallments > 1
                },
                createdAt: new Date() as any,
            });
            setSubmitted(true);
            toast({ title: "Inscrição Efetuada! 🎉", description: "Sua vaga foi reservada com sucesso." });
        } catch (error) {
            toast({ variant: 'destructive', title: "Erro ao enviar", description: "Tente novamente em instantes." });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <Card className="max-w-md mx-auto text-center p-8 border-none shadow-2xl bg-white animate-in zoom-in-95">
                <div className="size-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                    <CheckCircle size={40} />
                </div>
                <CardTitle className="text-2xl font-black italic tracking-tighter uppercase mb-2">Inscrição Confirmada!</CardTitle>
                <CardDescription className="text-base font-medium leading-relaxed">
                    Olá <strong>{formData.name}</strong>, sua vaga no curso <strong>{selectedCourse?.name}</strong> foi registrada com sucesso.
                    {paymentChoice === 'pix' ? (
                        <span className="block mt-2 font-bold text-emerald-700 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
                            ⚡ Pagamento via PIX selecionado. Enviaremos a chave PIX no seu WhatsApp!
                        </span>
                    ) : (
                        <span className="block mt-2 font-bold text-indigo-700 bg-indigo-50 p-3 rounded-xl border border-indigo-200">
                            💳 Pagamento parcelado no Cartão de Crédito em {selectedInstallments}x de R$ {calculateCardInstallments(selectedInstallments).perInstallment.toFixed(2).replace('.', ',')}.
                        </span>
                    )}
                </CardDescription>
                <Button className="mt-8 w-full h-12 font-black uppercase tracking-widest" variant="outline" onClick={() => window.location.reload()}>
                    Fazer outra inscrição
                </Button>
            </Card>
        );
    }

    return (
        <Card className="max-w-2xl mx-auto border-none shadow-2xl overflow-hidden bg-white">
            <div className="bg-slate-900 p-8 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 opacity-10 rotate-12">
                    <School size={120} />
                </div>
                <Badge variant="outline" className="text-primary border-primary/30 bg-primary/5 font-black uppercase text-[10px] mb-4">Portal de Inscrições</Badge>
                <CardTitle className="text-3xl font-black italic tracking-tighter uppercase leading-none">Faça parte do crescimento</CardTitle>
                <CardDescription className="text-slate-400 font-medium mt-2">Escolha seu curso e comece sua jornada ministerial na IBM.</CardDescription>
                
                <div className="flex gap-2 mt-8">
                    <div className={cn("h-1.5 flex-1 rounded-full transition-all duration-500", step >= 1 ? "bg-primary" : "bg-slate-100/20")} />
                    <div className={cn("h-1.5 flex-1 rounded-full transition-all duration-500", step >= 2 ? "bg-primary" : "bg-slate-100/20")} />
                    <div className={cn("h-1.5 flex-1 rounded-full transition-all duration-500", step >= 3 ? "bg-primary" : "bg-slate-100/20")} />
                    {isCoursePaid && (
                        <div className={cn("h-1.5 flex-1 rounded-full transition-all duration-500", step >= 4 ? "bg-primary" : "bg-slate-100/20")} />
                    )}
                </div>
            </div>

            <CardContent className="p-8">
                {step === 1 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex items-center gap-2 text-primary font-black uppercase text-xs tracking-widest mb-4">
                            <BookOpen size={16} /> 1. Escolha seu curso
                        </div>
                        <div className="grid gap-4">
                            {courses.map(course => (
                                <button 
                                    key={course.id}
                                    onClick={() => handleSelectCourse(course.id)}
                                    className={cn(
                                        "w-full p-5 rounded-2xl border-2 text-left transition-all hover:border-primary/50 group flex items-center justify-between",
                                        formData.courseId === course.id ? "border-primary bg-primary/5" : "border-slate-100 bg-slate-50/50"
                                    )}
                                >
                                    <div className="min-w-0 pr-4">
                                        <p className="font-black text-slate-900 uppercase italic tracking-tighter group-hover:text-primary transition-colors">{course.name}</p>
                                        <p className="text-xs text-slate-500 line-clamp-1 mt-1">{course.description}</p>
                                        <Badge variant="secondary" className="mt-3 text-[9px] font-black uppercase h-5">{course.ministryName}</Badge>
                                    </div>
                                    <ArrowRight size={20} className="text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {step === 2 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex items-center gap-2 text-primary font-black uppercase text-xs tracking-widest mb-4">
                            <Clock size={16} /> 2. Selecione a Turma
                        </div>
                        <div className="p-4 bg-primary/5 rounded-2xl border-2 border-primary/10 mb-6">
                            <p className="text-[10px] font-black uppercase text-primary/60 tracking-widest leading-none mb-1">Curso Selecionado</p>
                            <p className="font-black text-xl italic tracking-tighter uppercase text-slate-900">{selectedCourse?.name}</p>
                        </div>

                        {availableClasses.length === 0 ? (
                            <div className="py-12 text-center border-2 border-dashed rounded-2xl bg-muted/5">
                                <p className="text-slate-500 font-bold">Não há turmas com inscrições abertas no momento.</p>
                                <p className="text-xs text-slate-400 mt-1">Você pode prosseguir para deixar seu interesse registrado.</p>
                                <Button variant="link" className="mt-4 font-black uppercase text-xs tracking-widest" onClick={() => setStep(3)}>Prosseguir mesmo assim</Button>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {availableClasses.map(cls => (
                                    <button 
                                        key={cls.id}
                                        onClick={() => { setFormData(p => ({...p, classId: cls.id})); setStep(3); }}
                                        className={cn(
                                            "w-full p-4 rounded-xl border-2 text-left transition-all hover:border-primary group flex items-center justify-between",
                                            formData.classId === cls.id ? "border-primary bg-primary/5" : "border-slate-100"
                                        )}
                                    >
                                        <div>
                                            <p className="font-bold text-slate-900">{cls.name}</p>
                                            <p className="text-xs text-slate-500 mt-1">{cls.dayOfWeek} às {cls.startTime}</p>
                                        </div>
                                        <div className={cn("size-6 rounded-full border-2 flex items-center justify-center transition-all", formData.classId === cls.id ? "bg-primary border-primary text-white" : "border-slate-300 group-hover:border-primary")}>
                                            {formData.classId === cls.id && <CheckCircle size={14} />}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                        <Button variant="ghost" className="w-full text-xs font-bold" onClick={() => setStep(1)}><ArrowLeft className="mr-2 size-3" /> Voltar para cursos</Button>
                    </div>
                )}

                {step === 3 && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex items-center gap-2 text-primary font-black uppercase text-xs tracking-widest mb-4">
                            <User size={16} /> 3. Seus Dados
                        </div>
                        
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">Nome Completo</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 size-4 text-slate-400" />
                                    <Input name="name" value={formData.name} onChange={handleInputChange} className="pl-10 h-11" placeholder="Como devemos te chamar?" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">E-mail</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-3 size-4 text-slate-400" />
                                        <Input type="email" name="email" value={formData.email} onChange={handleInputChange} className="pl-10 h-11" placeholder="seu@email.com" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">WhatsApp</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-3 size-4 text-slate-400" />
                                        <Input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="pl-10 h-11" placeholder="(21) 99999-9999" />
                                    </div>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label className="text-[10px] uppercase font-black text-muted-foreground tracking-widest">CPF / CNPJ {isCoursePaid && <span className="text-rose-500">* (Obrigatório para emissão da fatura)</span>}</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-3 size-4 text-slate-400" />
                                    <Input name="cpf" value={formData.cpf} onChange={handleInputChange} className="pl-10 h-11" placeholder="000.000.000-00" />
                                </div>
                            </div>
                        </div>

                        <div className="pt-6 flex flex-col gap-3">
                            {isCoursePaid ? (
                                <Button size="lg" className="w-full h-14 font-black uppercase tracking-widest text-base shadow-xl shadow-primary/20" onClick={() => setStep(4)}>
                                    Avançar para Pagamento <ArrowRight className="ml-2 size-5" />
                                </Button>
                            ) : (
                                <Button size="lg" className="w-full h-14 font-black uppercase tracking-widest text-base shadow-xl shadow-primary/20" onClick={handleSubmit} disabled={isSubmitting}>
                                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : null}
                                    Finalizar Inscrição Gratuita
                                </Button>
                            )}
                            <Button variant="ghost" className="w-full text-xs font-bold" onClick={() => setStep(2)}><ArrowLeft className="mr-2 size-3" /> Voltar</Button>
                        </div>
                    </div>
                )}

                {/* PASSO 4: PAGAMENTO E CONDIÇÕES */}
                {step === 4 && isCoursePaid && (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                        <div className="flex items-center gap-2 text-primary font-black uppercase text-xs tracking-widest mb-4">
                            💳 4. Forma de Pagamento
                        </div>

                        {/* Valor base do curso */}
                        <div className="p-4 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
                            <div>
                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Investimento do Curso</p>
                                <p className="text-xl font-black italic tracking-tighter uppercase">{selectedCourse?.name}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-2xl font-black text-emerald-400">R$ {baseTotalAmount.toFixed(2).replace('.', ',')}</p>
                            </div>
                        </div>

                        {/* Seleção de método */}
                        <div className="space-y-3">
                            <Label className="text-xs font-bold uppercase text-slate-600">Escolha como prefere pagar:</Label>

                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    type="button"
                                    onClick={() => setPaymentChoice('pix')}
                                    className={cn(
                                        "p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between h-28",
                                        paymentChoice === 'pix' ? "border-emerald-600 bg-emerald-50/50" : "border-slate-200"
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-lg">⚡</span>
                                        {paymentChoice === 'pix' && <CheckCircle size={16} className="text-emerald-600" />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-slate-900">PIX / Boleto</p>
                                        <p className="text-[10px] text-emerald-700 font-semibold">À Vista sem juros</p>
                                    </div>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setPaymentChoice('credit_card')}
                                    className={cn(
                                        "p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between h-28",
                                        paymentChoice === 'credit_card' ? "border-indigo-600 bg-indigo-50/50" : "border-slate-200"
                                    )}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-lg">💳</span>
                                        {paymentChoice === 'credit_card' && <CheckCircle size={16} className="text-indigo-600" />}
                                    </div>
                                    <div>
                                        <p className="font-bold text-sm text-slate-900">Cartão de Crédito</p>
                                        <p className="text-[10px] text-indigo-700 font-semibold">Parcelado no cartão</p>
                                    </div>
                                </button>
                            </div>
                        </div>

                        {/* Opções de parcelamento do cartão com repasse de juros */}
                        {paymentChoice === 'credit_card' && (
                            <div className="p-4 bg-indigo-50/60 rounded-2xl border border-indigo-200 space-y-3">
                                <div className="flex items-center justify-between">
                                    <Label className="text-xs font-bold text-indigo-900 uppercase">Selecione o número de parcelas:</Label>
                                    <span className="text-[10px] bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded-full font-bold">Com Repasse de Taxas</span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {Array.from({ length: Math.max(maxInstallments, 6) }, (_, i) => i + 1).map(count => {
                                        const calc = calculateCardInstallments(count);
                                        const isSelected = selectedInstallments === count;
                                        return (
                                            <button
                                                key={count}
                                                type="button"
                                                onClick={() => setSelectedInstallments(count)}
                                                className={cn(
                                                    "p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition-all",
                                                    isSelected ? "border-indigo-600 bg-indigo-600 text-white font-bold" : "border-indigo-200 bg-white text-slate-700 hover:border-indigo-400"
                                                )}
                                            >
                                                <span>{count}x de R$ {calc.perInstallment.toFixed(2).replace('.', ',')}</span>
                                                {count > 1 && <span className={cn("text-[9px]", isSelected ? "text-indigo-200" : "text-slate-400")}>Total: R$ {calc.total.toFixed(2).replace('.', ',')}</span>}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="pt-4 flex flex-col gap-3">
                            <Button size="lg" className="w-full h-14 font-black uppercase tracking-widest text-base shadow-xl shadow-primary/20 bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleSubmit} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : null}
                                Confirmar e Concluir Inscrição
                            </Button>
                            <Button variant="ghost" className="w-full text-xs font-bold" onClick={() => setStep(3)}><ArrowLeft className="mr-2 size-3" /> Voltar aos dados</Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

