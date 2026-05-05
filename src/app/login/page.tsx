'use client';

import Image from "next/image";
import { useRouter } from "next/navigation";
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Logo } from "@/components/icons";
import { useFirebase } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, query, limit } from 'firebase/firestore';
import Link from 'next/link';
import { ArrowLeft, Loader2, AlertCircle, Mail, Key, CheckCircle2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
  
export default function LoginPage() {
  const loginImage = PlaceHolderImages.find(p => p.id === 'login-background');
  const router = useRouter();
  const { firestore, auth, user: loggedUser } = useFirebase();
  const { toast } = useToast();
  
  const [isLoadingGoogle, setIsLoadingGoogle] = useState(false);
  const [isLoadingEmail, setIsLoadingEmail] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Tabs for Email Auth
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  // Redirect if already logged in
  React.useEffect(() => {
    if (loggedUser) {
      router.push('/dashboard');
    }
  }, [loggedUser, router]);

  const ensureUserDoc = async (user: any, providedName?: string) => {
      const userDocRef = doc(firestore!, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        const usersCollectionQuery = query(collection(firestore!, 'users'), limit(1));
        const usersSnapshot = await getDocs(usersCollectionQuery);
        const isFirstUser = usersSnapshot.empty;
        
        const userRole = isFirstUser ? 'admin' : '';

        await setDoc(userDocRef, {
          name: user.displayName || providedName || 'Novo Usuário',
          email: user.email || '',
          phone: user.phoneNumber || '',
          hierarchy: {
            role: userRole
          },
          integrationStatus: 'nao_alcancado',
          createdAt: serverTimestamp(),
        });
      }
  };
  
  const handleGoogleLogin = React.useCallback(async () => {
    if (!auth || !firestore) return;
    setIsLoadingGoogle(true);
    setErrorMsg('');

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await ensureUserDoc(result.user);
      router.push('/dashboard');
    } catch (error: any) {
      setIsLoadingGoogle(false);
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') return;
      if (error.code === 'auth/popup-blocked') {
         setErrorMsg("O navegador bloqueou a janela de login. Use o login com E-mail ou abra o site fora do editor.");
         return;
      }
      console.error("Google sign-in failed", error);
      setErrorMsg("Ocorreu um erro ao tentar fazer login com Google.");
    }
  }, [auth, firestore, router]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !firestore) return;
    
    if (mode === 'forgot') {
        if (!email) { setErrorMsg('Informe seu e-mail.'); return; }
        setIsLoadingEmail(true);
        setErrorMsg('');
        try {
            await sendPasswordResetEmail(auth, email);
            setSuccessMsg('E-mail de redefinição enviado! Verifique sua caixa de entrada.');
            toast({ title: "Sucesso", description: "E-mail de redefinição enviado!" });
        } catch (error: any) {
            console.error(error);
            setErrorMsg('Erro ao enviar e-mail. Verifique se o endereço está correto.');
        } finally {
            setIsLoadingEmail(false);
        }
        return;
    }

    if (!email || !password || (mode === 'register' && !name)) {
        setErrorMsg('Preencha todos os campos obrigatórios.');
        return;
    }

    setIsLoadingEmail(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
        if (mode === 'login') {
            const result = await signInWithEmailAndPassword(auth, email, password);
            await ensureUserDoc(result.user);
        } else {
            const result = await createUserWithEmailAndPassword(auth, email, password);
            await ensureUserDoc(result.user, name);
        }
        router.push('/dashboard');
    } catch (error: any) {
        setIsLoadingEmail(false);
        console.error("Email auth failed", error);
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
             setErrorMsg('E-mail ou senha incorretos.');
        } else if (error.code === 'auth/email-already-in-use') {
             setErrorMsg('Este e-mail já está em uso.');
        } else if (error.code === 'auth/weak-password') {
             setErrorMsg('A senha deve ter pelo menos 6 caracteres.');
        } else {
             setErrorMsg('Erro ao autenticar. Tente novamente.');
        }
    }
  };

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="flex flex-col items-center justify-center py-12 px-4 relative overflow-y-auto min-h-screen">
        <Button variant="ghost" asChild className="absolute top-4 left-4 lg:top-8 lg:left-8">
            <Link href="/">
                <ArrowLeft className="mr-2 size-4"/> Voltar
            </Link>
        </Button>

        <div className="mx-auto grid w-full max-w-[350px] gap-6 mt-16 lg:mt-0">
          <div className="grid gap-4 text-center">
            <div className="flex justify-center items-center gap-2 mb-2">
              <Logo className="h-10 w-10 text-primary" />
              <h1 className="text-3xl font-bold">OikoApp</h1>
            </div>
            <h2 className="text-xl font-bold tracking-tight">Portal do Membro</h2>
            <p className="text-balance text-sm text-muted-foreground">
              Acesse sua jornada ministerial.
            </p>
          </div>

          <div className="grid gap-4">
            {errorMsg && (
                <div className="p-3 bg-destructive/10 text-destructive text-sm font-semibold rounded-md flex items-start gap-3 border border-destructive/20 text-left">
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                    <p>{errorMsg}</p>
                </div>
            )}

            {successMsg && (
                <div className="p-3 bg-emerald-50 text-emerald-700 text-sm font-semibold rounded-md flex items-start gap-3 border border-emerald-200 text-left">
                    <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
                    <p>{successMsg}</p>
                </div>
            )}

            {/* Email Form */}
            <div className="bg-muted/30 p-4 rounded-xl border">
                <div className="flex gap-2 mb-4 p-1 bg-muted rounded-lg">
                    <button 
                        onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
                        className={`flex-1 text-xs font-bold py-2 rounded-md transition-colors ${mode === 'login' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Entrar
                    </button>
                    <button 
                        onClick={() => { setMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
                        className={`flex-1 text-xs font-bold py-2 rounded-md transition-colors ${mode === 'register' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                        Criar Conta
                    </button>
                </div>

                <form onSubmit={handleEmailAuth} className="space-y-4">
                    {mode === 'forgot' ? (
                        <div className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                             <div className="space-y-1">
                                <Label className="text-xs font-bold text-muted-foreground uppercase">E-mail de Recuperação</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                    <Input type="email" placeholder="seu@email.com" className="pl-9" value={email} onChange={e => setEmail(e.target.value)} required />
                                </div>
                            </div>
                            <Button type="submit" disabled={isLoadingEmail} className="w-full font-bold">
                                {isLoadingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Enviar Link de Recuperação'}
                            </Button>
                            <button 
                                type="button"
                                onClick={() => setMode('login')}
                                className="w-full text-center text-xs font-bold text-primary hover:underline"
                            >
                                Voltar para o Login
                            </button>
                        </div>
                    ) : (
                        <>
                            {mode === 'register' && (
                                <div className="space-y-1">
                                    <Label className="text-xs font-bold text-muted-foreground uppercase">Nome Completo</Label>
                                    <Input placeholder="Seu nome" value={name} onChange={e => setName(e.target.value)} required />
                                </div>
                            )}
                            <div className="space-y-1">
                                <Label className="text-xs font-bold text-muted-foreground uppercase">E-mail</Label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                    <Input type="email" placeholder="seu@email.com" className="pl-9" value={email} onChange={e => setEmail(e.target.value)} required />
                                </div>
                            </div>
                            <div className="space-y-1">
                                <div className="flex justify-between items-center">
                                    <Label className="text-xs font-bold text-muted-foreground uppercase">Senha</Label>
                                    {mode === 'login' && (
                                        <button 
                                            type="button" 
                                            onClick={() => { setMode('forgot'); setErrorMsg(''); setSuccessMsg(''); }}
                                            className="text-[10px] font-black text-primary hover:underline uppercase"
                                        >
                                            Esqueceu a senha?
                                        </button>
                                    )}
                                </div>
                                <div className="relative">
                                    <Key className="absolute left-3 top-3 size-4 text-muted-foreground" />
                                    <Input type="password" placeholder="••••••••" className="pl-9" value={password} onChange={e => setPassword(e.target.value)} required={mode !== 'forgot'} minLength={6} />
                                </div>
                            </div>
                            
                            <Button type="submit" disabled={isLoadingEmail || isLoadingGoogle} className="w-full font-bold">
                                {isLoadingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (mode === 'login' ? 'Acessar' : 'Cadastrar')}
                            </Button>
                        </>
                    )}
                </form>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
              <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Ou continue com</span></div>
            </div>

            <Button onClick={handleGoogleLogin} variant="outline" disabled={isLoadingGoogle || isLoadingEmail} className="w-full font-bold bg-white hover:bg-slate-50 border-slate-200 text-slate-700">
              {isLoadingGoogle ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (
                  <>
                    <svg className="mr-2 size-4" viewBox="0 0 24 24">
                        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                    </svg>
                    Google
                  </>
              )}
            </Button>
          </div>
        </div>
      </div>
      <div className="hidden bg-muted lg:block">
        {loginImage && (
          <Image
            src={loginImage.imageUrl}
            alt={loginImage.description}
            width="1200"
            height="800"
            data-ai-hint={loginImage.imageHint}
            className="h-full w-full object-cover dark:brightness-[0.3]"
          />
        )}
      </div>
    </div>
  );
}