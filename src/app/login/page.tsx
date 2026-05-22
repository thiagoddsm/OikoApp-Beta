'use client';

import { useRouter } from "next/navigation";
import React, { useState } from 'react';
import { useFirebase } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { registerOrLinkUser, resolveUserProfile } from '@/app/actions/auth-actions';

export default function LoginPage() {
  const router = useRouter();
  const { auth, user: loggedUser } = useFirebase();
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
  const [showPassword, setShowPassword] = useState(false);

  // Redirect if already logged in
  React.useEffect(() => {
    if (loggedUser) {
      router.push('/dashboard');
    }
  }, [loggedUser, router]);

  const handleGoogleLogin = React.useCallback(async () => {
    if (!auth) return;
    setIsLoadingGoogle(true);
    setErrorMsg('');

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const { user } = result;

      // Resolve/vincula o perfil no Firestore via Server Action (Admin SDK)
      const resolved = await resolveUserProfile({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        provider: 'google',
      });

      if (resolved.action === 'linked') {
        toast({
          title: '🔗 Perfil vinculado!',
          description: 'Seu cadastro foi encontrado e vinculado automaticamente ao seu acesso Google.',
        });
      }

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
  }, [auth, router, toast]);

  const handleAppleLogin = () => {
    toast({
      title: ' Login com Apple',
      description: 'Esta opção estará disponível em breve.',
    });
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    
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
            // Login com e-mail/senha existente
            const result = await signInWithEmailAndPassword(auth, email, password);
            const { user } = result;

            // Resolve/vincula o perfil no Firestore via Server Action
            const resolved = await resolveUserProfile({
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              provider: 'email',
            });

            if (resolved.action === 'linked') {
              toast({
                title: '🔗 Perfil vinculado!',
                description: 'Seu cadastro foi encontrado e vinculado automaticamente ao seu e-mail.',
              });
            }
        } else {
            // Modo "Primeiro Acesso": Verifica se já existe na base para vincular
            const serverResult = await registerOrLinkUser(email, password, name);
            
            if (serverResult.success === false && serverResult.code === 'auth/email-already-in-use') {
                 throw { code: 'auth/email-already-in-use' };
            } else if (serverResult.success === false) {
                 throw new Error(serverResult.error || 'Erro no servidor.');
            }

            if (serverResult.linked) {
                 // Auth criado no servidor com o UID do Firestore — faz login normal
                 await signInWithEmailAndPassword(auth, email, password);
                 toast({
                   title: '🔗 Perfil vinculado!',
                   description: 'Seu cadastro existente foi vinculado ao seu acesso. Bem-vindo!',
                 });
            } else {
                 // Não encontrou na base — cria conta e resolve perfil
                 const result = await createUserWithEmailAndPassword(auth, email, password);
                 await resolveUserProfile({
                   uid: result.user.uid,
                   email: result.user.email,
                   displayName: name || result.user.displayName,
                   provider: 'email',
                 });
            }
        }
        router.push('/dashboard');
    } catch (error: any) {
        setIsLoadingEmail(false);
        console.error("Email auth failed", error);
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
             setErrorMsg('E-mail ou senha incorretos.');
        } else if (error.code === 'auth/email-already-in-use') {
             setMode('forgot');
             setErrorMsg('Este e-mail já possui uma senha/login cadastrado. Se não lembra, você pode redefinir sua senha abaixo.');
        } else if (error.code === 'auth/weak-password') {
             setErrorMsg('A senha deve ter pelo menos 6 caracteres.');
        } else {
             setErrorMsg('Erro ao autenticar. Tente novamente.');
        }
    }
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Hanken+Grotesk:wght@600;700&display=swap');
        @import url('https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200');

        .material-symbols-outlined {
            font-variation-settings: 'FILL' 0, 'wght' 300, 'GRAD' 0, 'opsz' 24;
            vertical-align: middle;
            font-family: 'Material Symbols Outlined';
            font-weight: normal;
            font-style: normal;
            font-size: 24px;
            line-height: 1;
            letter-spacing: normal;
            text-transform: none;
            display: inline-block;
            white-space: nowrap;
            word-wrap: normal;
            direction: ltr;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
            text-rendering: optimizeLegibility;
            font-feature-settings: 'liga';
        }
        .glass-card {
            background: rgba(255, 255, 255, 0.65);
            backdrop-filter: blur(24px) saturate(180%);
            -webkit-backdrop-filter: blur(24px) saturate(180%);
            border: 1px solid rgba(255, 255, 255, 0.4);
        }
        .premium-shadow {
            box-shadow: 
                0 4px 6px -1px rgba(0, 0, 0, 0.02),
                0 10px 15px -3px rgba(0, 0, 0, 0.03),
                0 20px 25px -5px rgba(0, 0, 0, 0.03),
                0 30px 50px -12px rgba(0, 0, 0, 0.05);
        }
        .bg-mesh {
            background: 
                radial-gradient(circle at 0% 0%, rgba(242, 101, 34, 0.03) 0%, transparent 50%),
                radial-gradient(circle at 100% 100%, rgba(166, 59, 0, 0.05) 0%, transparent 50%),
                #fcf9f8;
        }
        .floating-element {
            animation: float 20s ease-in-out infinite;
        }
        @keyframes float {
            0%, 100% { transform: translateY(0) scale(1); }
            50% { transform: translateY(-20px) scale(1.02); }
        }
        .btn-premium-hover {
            transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .btn-premium-hover:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 24px -8px rgba(242, 101, 34, 0.5);
        }
        
        .font-body-md { font-family: 'Inter', sans-serif; font-size: 16px; line-height: 1.5; font-weight: 400; }
        .font-label-sm { font-family: 'Inter', sans-serif; font-size: 12px; line-height: 1; font-weight: 600; }
        .font-label-md { font-family: 'Inter', sans-serif; font-size: 14px; line-height: 1; letter-spacing: 0.01em; font-weight: 500; }
        .font-headline-md { font-family: 'Hanken Grotesk', sans-serif; font-size: 32px; line-height: 1.2; letter-spacing: -0.01em; font-weight: 600; }
        .font-headline-sm { font-family: 'Hanken Grotesk', sans-serif; font-size: 24px; line-height: 1.3; font-weight: 600; }

        .text-on-surface { color: #1c1b1b; }
        .text-on-surface-variant { color: #594138; }
        .text-on-surface-variant-80 { color: rgba(89, 65, 56, 0.8); }
        .text-on-surface-variant-70 { color: rgba(89, 65, 56, 0.7); }
        .text-on-surface-variant-40 { color: rgba(89, 65, 56, 0.4); }
        .text-on-surface-variant-10 { color: rgba(89, 65, 56, 0.1); }
        .text-on-surface-70 { color: rgba(28, 27, 27, 0.7); }
        .text-primary-container { color: #f26522; }
        .text-primary-container-80 { color: rgba(242, 101, 34, 0.8); }
        .text-primary { color: #a63b00; }
        .text-outline-50 { color: rgba(141, 113, 102, 0.5); }
        .text-outline-40 { color: rgba(141, 113, 102, 0.4); }
        
        .focus-ring-primary-container-20:focus {
          outline: none;
          box-shadow: 0 0 0 1px rgba(242, 101, 34, 0.2);
        }
        .focus-border-primary-container-30:focus {
          border-color: rgba(242, 101, 34, 0.3);
        }
        .placeholder-text-outline-variant-60::placeholder { color: rgba(225, 191, 179, 0.6); }
        .bg-primary-container { background-color: #f26522; }
        .bg-surface-container-low-50 { background-color: rgba(246, 243, 242, 0.5); }
        .shadow-primary-container-10 { --tw-shadow-color: rgba(242, 101, 34, 0.1); }
        .border-on-surface-variant-10 { border-color: rgba(89, 65, 56, 0.1); }
        .border-on-surface-variant-20 { border-color: rgba(89, 65, 56, 0.2); }
        
        .py-4\\.5 {
          padding-top: 1.125rem;
          padding-bottom: 1.125rem;
        }
      ` }} />

      <div className="bg-mesh font-body-md text-on-surface min-h-screen flex flex-col relative overflow-x-hidden">
        {/* Backdrop Image Animation */}
        <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
          <img 
            alt="Network Visualization" 
            className="absolute -right-20 top-1/4 w-[800px] h-auto opacity-[0.07] floating-element" 
            src="https://lh3.googleusercontent.com/aida/ADBb0uhFsG9mPizji2zDOeKHRksX34r0dzDSqAOJ5hvLmHnDKFkeJwcTEhHltnOheGDmCMhUMZEfWpUgOwN-VO3W9ly_wacSJeNLk5ITXu-nKq3qi9ilkONYS20fSE4Q6fPqB4qgpdH_z_UUbDQi682MFuJVDaTo7i29X0j2ekhbCODaGj_bLurNqfjXFMg2ak3GmX2hKL3-8RFTNa0DvZ3bOiV457tGPtuYOX-cUb-NyE1WkUvZntxCpHXZncQM" 
          />
          <img 
            alt="Network Visualization" 
            className="absolute -left-40 -bottom-20 w-[600px] h-auto opacity-[0.04] floating-element" 
            src="https://lh3.googleusercontent.com/aida/ADBb0uhFsG9mPizji2zDOeKHRksX34r0dzDSqAOJ5hvLmHnDKFkeJwcTEhHltnOheGDmCMhUMZEfWpUgOwN-VO3W9ly_wacSJeNLk5ITXu-nKq3qi9ilkONYS20fSE4Q6fPqB4qgpdH_z_UUbDQi682MFuJVDaTo7i29X0j2ekhbCODaGj_bLurNqfjXFMg2ak3GmX2hKL3-8RFTNa0DvZ3bOiV457tGPtuYOX-cUb-NyE1WkUvZntxCpHXZncQM" 
            style={{ animationDelay: '-5s' }} 
          />
        </div>

        <header className="fixed top-0 w-full z-50 flex justify-between items-center px-8 md:px-12 py-8">
          <Link 
            href="/"
            className="flex items-center gap-2 group backdrop-blur-sm px-4 py-2 rounded-full border border-white/20 hover:bg-white/40 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-on-surface-variant text-xl transition-transform group-hover:-translate-x-1">arrow_back</span>
            <span className="font-label-md text-on-surface-variant group-hover:text-primary transition-colors">Voltar</span>
          </Link>
        </header>

        <main className="flex-grow flex flex-col items-center justify-center relative px-8 md:px-12 py-24 z-10">
          <div className="w-full max-w-md space-y-10">
            {/* Logo Sizing */}
            <div className="flex flex-col items-center gap-6">
              <img 
                alt="Logo" 
                className="h-24 w-auto object-contain transition-transform duration-700 hover:scale-105" 
                src="https://firebasestorage.googleapis.com/v0/b/studio-1424813022-71754.firebasestorage.app/o/pwa%2FChatGPT%20Image%207%20de%20mai.%20de%202026%2C%2016_45_54.png?alt=media&token=c8100c94-fb27-4b1f-87b8-74bd1f8d3fe5" 
              />
              <div className="text-center space-y-2">
                <h1 className="font-headline-md text-on-surface">Portal do Membro</h1>
                <p className="font-body-md text-on-surface-variant-80">Acesse sua jornada ministerial.</p>
              </div>
            </div>

            <div className="glass-card rounded-3xl premium-shadow p-8 md:p-12">
              {/* Error and Success alerts */}
              {errorMsg && (
                <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm font-semibold rounded-2xl flex items-start gap-3 border border-red-200 text-left animate-in slide-in-from-top-2">
                  <span className="material-symbols-outlined text-red-500 text-xl shrink-0 mt-0.5">error</span>
                  <p>{errorMsg}</p>
                </div>
              )}

              {successMsg && (
                <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 text-sm font-semibold rounded-2xl flex items-start gap-3 border border-emerald-200 text-left animate-in slide-in-from-top-2">
                  <span className="material-symbols-outlined text-emerald-600 text-xl shrink-0 mt-0.5">check_circle</span>
                  <p>{successMsg}</p>
                </div>
              )}

              {/* Tab Switching Navigation */}
              {mode !== 'forgot' && (
                <div className="flex p-1.5 bg-surface-container-low-50 rounded-2xl mb-10 border border-white/20">
                  <button 
                    onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
                    className={`flex-1 py-3 text-center rounded-xl font-label-md transition-all duration-500 ${mode === 'login' ? 'bg-white shadow-sm text-primary-container font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}
                    id="tab-login"
                  >
                    Entrar
                  </button>
                  <button 
                    onClick={() => { setMode('register'); setErrorMsg(''); setSuccessMsg(''); }}
                    className={`flex-1 py-3 text-center rounded-xl font-label-md transition-all duration-500 ${mode === 'register' ? 'bg-white shadow-sm text-primary-container font-bold' : 'text-on-surface-variant hover:text-on-surface'}`}
                    id="tab-register"
                  >
                    Primeiro Acesso
                  </button>
                </div>
              )}

              <form onSubmit={handleEmailAuth} className="space-y-8">
                {mode === 'forgot' ? (
                  <div className="space-y-8 animate-in fade-in zoom-in-95 duration-200">
                    <div className="text-center space-y-2">
                      <h2 className="font-headline-sm text-on-surface">Recuperar Acesso</h2>
                      <p className="font-body-md text-on-surface-variant-80">Informe seu e-mail para receber as instruções de recuperação de senha.</p>
                    </div>

                    <div className="space-y-2.5">
                      <label className="font-label-sm text-on-surface-variant-70 uppercase tracking-[0.1em] ml-1 block">E-mail</label>
                      <div className="relative group">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-50 text-xl transition-colors group-focus-within:text-primary-container">mail</span>
                        <input 
                          className="w-full pl-12 pr-4 py-4 bg-white/40 border border-transparent rounded-xl focus:ring-1 focus-ring-primary-container-20 focus-border-primary-container-30 focus:bg-white transition-all placeholder-text-outline-variant-60 font-body-md text-on-surface outline-none" 
                          placeholder="seu@email.com" 
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <button 
                      className="w-full bg-primary-container text-white py-4.5 rounded-full font-label-md font-bold uppercase tracking-[0.15em] shadow-xl shadow-primary-container-10 btn-premium-hover flex items-center justify-center min-h-[56px] disabled:opacity-50" 
                      type="submit"
                      disabled={isLoadingEmail}
                    >
                      {isLoadingEmail ? <Loader2 className="animate-spin size-5" /> : 'ENVIAR LINK'}
                    </button>

                    <button 
                      type="button"
                      onClick={() => { setMode('login'); setErrorMsg(''); setSuccessMsg(''); }}
                      className="w-full text-center font-label-sm text-primary-container-80 uppercase tracking-widest hover:text-primary-container transition-colors"
                    >
                      Voltar para o Login
                    </button>
                  </div>
                ) : (
                  <>
                    {mode === 'register' && (
                      <div className="space-y-2.5 animate-in fade-in slide-in-from-top-2">
                        <label className="font-label-sm text-on-surface-variant-70 uppercase tracking-[0.1em] ml-1 block">Nome Completo</label>
                        <div className="relative group">
                          <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-50 text-xl transition-colors group-focus-within:text-primary-container">person</span>
                          <input 
                            className="w-full pl-12 pr-4 py-4 bg-white/40 border border-transparent rounded-xl focus:ring-1 focus-ring-primary-container-20 focus-border-primary-container-30 focus:bg-white transition-all placeholder-text-outline-variant-60 font-body-md text-on-surface outline-none" 
                            placeholder="Seu nome completo" 
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            required
                          />
                        </div>
                        <p className="text-[11px] text-on-surface-variant-70 mt-1.5 ml-1">
                          Se você já possui cadastro na igreja, use o mesmo e-mail para vincular sua conta automaticamente.
                        </p>
                      </div>
                    )}

                    <div className="space-y-2.5">
                      <label className="font-label-sm text-on-surface-variant-70 uppercase tracking-[0.1em] ml-1 block">E-mail</label>
                      <div className="relative group">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-50 text-xl transition-colors group-focus-within:text-primary-container">mail</span>
                        <input 
                          className="w-full pl-12 pr-4 py-4 bg-white/40 border border-transparent rounded-xl focus:ring-1 focus-ring-primary-container-20 focus-border-primary-container-30 focus:bg-white transition-all placeholder-text-outline-variant-60 font-body-md text-on-surface outline-none" 
                          placeholder="seu@email.com" 
                          type="email"
                          value={email}
                          onChange={e => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex justify-between items-center ml-1">
                        <label className="font-label-sm text-on-surface-variant-70 uppercase tracking-[0.1em] block">
                          {mode === 'register' ? 'Criar Senha' : 'Senha'}
                        </label>
                        {mode === 'login' && (
                          <button 
                            type="button" 
                            onClick={() => { setMode('forgot'); setErrorMsg(''); setSuccessMsg(''); }}
                            className="font-label-sm text-primary-container-80 uppercase tracking-wider hover:text-primary-container transition-colors"
                          >
                            Esqueceu a senha?
                          </button>
                        )}
                      </div>
                      <div className="relative group">
                        <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline-50 text-xl transition-colors group-focus-within:text-primary-container">key</span>
                        <input 
                          className="w-full pl-12 pr-12 py-4 bg-white/40 border border-transparent rounded-xl focus:ring-1 focus-ring-primary-container-20 focus-border-primary-container-30 focus:bg-white transition-all placeholder-text-outline-variant-60 font-body-md text-on-surface outline-none" 
                          placeholder="••••••••" 
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={e => setPassword(e.target.value)}
                          required
                          minLength={6}
                        />
                        <button 
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-outline-40 hover:text-on-surface transition-colors cursor-pointer" 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                        </button>
                      </div>
                    </div>

                    <button 
                      className="w-full bg-primary-container text-white py-4.5 rounded-full font-label-md font-bold uppercase tracking-[0.15em] shadow-xl shadow-primary-container-10 btn-premium-hover flex items-center justify-center min-h-[56px] disabled:opacity-50" 
                      type="submit"
                      disabled={isLoadingEmail || isLoadingGoogle}
                    >
                      {isLoadingEmail ? <Loader2 className="animate-spin size-5" /> : (mode === 'login' ? 'ACESSAR' : 'CADASTRAR')}
                    </button>
                  </>
                )}
              </form>

              {/* Or continue with divider and buttons */}
              {mode !== 'forgot' && (
                <div className="mt-10">
                  <div className="relative flex items-center mb-8">
                    <div className="flex-grow border-t border-on-surface-variant-10"></div>
                    <span className="flex-shrink mx-4 font-label-sm text-[10px] text-on-surface-variant-40 uppercase tracking-[0.2em]">Ou continue com</span>
                    <div className="flex-grow border-t border-on-surface-variant-10"></div>
                  </div>

                  <div className="w-full">
                    <button 
                      onClick={handleGoogleLogin}
                      disabled={isLoadingGoogle || isLoadingEmail}
                      className="w-full flex items-center justify-center gap-3 py-3.5 border border-on-surface-variant-10 rounded-xl hover:bg-white hover:border-on-surface-variant-20 hover:shadow-sm transition-all duration-300 cursor-pointer disabled:opacity-50 min-h-[52px]"
                    >
                      {isLoadingGoogle ? (
                        <Loader2 className="animate-spin size-5 text-on-surface-variant" />
                      ) : (
                        <>
                          <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"></path>
                          </svg>
                          <span className="font-label-md text-on-surface-70">Google</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <footer className="text-center space-y-4">
              <p className="font-label-sm text-[11px] text-on-surface-variant-40 uppercase tracking-[0.1em]">
                © 2024 Igreja Batista da Manhã. Transforming the city through discipleship.
              </p>
            </footer>
          </div>
        </main>


      </div>
    </>
  );
}