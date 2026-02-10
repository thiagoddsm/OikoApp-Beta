'use client';

import Image from "next/image";
import { useRouter } from "next/navigation";
import React from 'react';
import { Button } from "@/components/ui/button";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Logo } from "@/components/icons";
import { useFirebase } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs, query, limit } from 'firebase/firestore';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
  
export default function LoginPage() {
  const loginImage = PlaceHolderImages.find(p => p.id === 'login-background');
  const router = useRouter();
  const { firestore, auth, user: loggedUser } = useFirebase();

  // Redirect if already logged in
  React.useEffect(() => {
    if (loggedUser) {
      router.push('/dashboard');
    }
  }, [loggedUser, router]);
  
  const handleGoogleLogin = React.useCallback(async () => {
    if (!auth || !firestore) {
      console.error("Firebase services not available.");
      return;
    }
    
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      const userDocRef = doc(firestore, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        const usersCollectionQuery = query(collection(firestore, 'users'), limit(1));
        const usersSnapshot = await getDocs(usersCollectionQuery);
        const isFirstUser = usersSnapshot.empty;
        
        // The first user to sign up is automatically an admin.
        const userRole = isFirstUser ? 'admin' : '';

        await setDoc(userDocRef, {
          name: user.displayName || 'Novo Usuário',
          email: user.email || '',
          phone: user.phoneNumber || '',
          hierarchy: {
            role: userRole
          },
          integrationStatus: 'nao_alcancado',
          createdAt: serverTimestamp(),
        });
      }
      
      router.push('/dashboard');

    } catch (error: any) {
      if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
        return;
      }
      console.error("Google sign-in failed", error);
    }
  }, [auth, firestore, router]);

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="flex flex-col items-center justify-center py-12 px-4 relative">
        <Button variant="ghost" asChild className="absolute top-8 left-8">
            <Link href="/">
                <ArrowLeft className="mr-2 size-4"/> Voltar para o Site
            </Link>
        </Button>

        <div className="mx-auto grid w-full max-w-[350px] gap-6 mt-16 lg:mt-0">
          <div className="grid gap-4 text-center">
            <div className="flex justify-center items-center gap-2 mb-4">
              <Logo className="h-10 w-10 text-primary" />
              <h1 className="text-3xl font-bold">OikoApp</h1>
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Portal do Membro</h2>
            <p className="text-balance text-muted-foreground">
              Acesse sua jornada ministerial e gerencie seu serviço na IBM.
            </p>
          </div>
          <div className="grid gap-4">
            <Button onClick={handleGoogleLogin} size="lg" className="w-full font-bold h-12">
              Entrar com Google
            </Button>
             <div className="text-center text-sm text-muted-foreground mt-4">
              Ainda não tem acesso? <br/>
              <Link href="/public/enrollment" className="underline font-semibold text-primary">
                Inscreva-se em um curso ou GC
              </Link>
            </div>
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
