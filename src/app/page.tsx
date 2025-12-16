'use client';

import Image from "next/image";
import { useRouter } from "next/navigation";
import React from 'react';
import { Button } from "@/components/ui/button";
import { PlaceHolderImages } from "@/lib/placeholder-images";
import { Logo } from "@/components/icons";
import { useFirebase } from '@/firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export default function LoginPage() {
  const loginImage = PlaceHolderImages.find(p => p.id === 'login-background');
  const router = useRouter();
  const { auth, firestore } = useFirebase();

  const handleGoogleLogin = async () => {
    if (auth && firestore) {
      try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        const user = result.user;

        // After successful sign-in, check if user exists in Firestore
        const userDocRef = doc(firestore, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (!userDoc.exists()) {
          // If user document doesn't exist, create it with a default 'membro' role.
          // The document ID is the user's UID from Authentication.
          await setDoc(userDocRef, {
            name: user.displayName || 'Novo Usuário',
            email: user.email || '',
            phone: user.phoneNumber || '',
            roles: ['member'],
            journey: {
              td: false,
              baptism: false,
              membership_course: false,
            },
            createdAt: serverTimestamp(),
          });
        }
        
        router.push('/dashboard');

      } catch (error: any) {
        // Don't log error if user cancels the popup
        if (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user') {
          return;
        }
        console.error("Google sign-in failed", error);
        // Handle error, e.g., show a toast message
      }
    }
  };
  
  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center py-12">
        <div className="mx-auto grid w-[350px] gap-6">
          <div className="grid gap-4 text-center">
            <div className="flex justify-center items-center gap-2 mb-4">
              <Logo className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">OikoApp</h1>
            </div>
            <h2 className="text-2xl font-bold">Boas-vindas!</h2>
            <p className="text-balance text-muted-foreground">
              Crie sua conta ou faça login para continuar.
            </p>
          </div>
          <div className="grid gap-4">
            <Button onClick={handleGoogleLogin} className="w-full">
              Entrar com Google
            </Button>
             <div className="text-center text-sm">
              Já tem uma conta?{" "}
              <button onClick={handleGoogleLogin} className="underline font-semibold">
                Acesse aqui
              </button>
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
