'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, Award, Upload, ShieldCheck, Check } from "lucide-react";
import { useFirebase, useDoc } from '@/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { useToast } from '@/hooks/use-toast';

export function CertificateSettings() {
  const { firestore, storage } = useFirebase();
  const { toast } = useToast();
  const { data: tenantConfig, isLoading: loadingConfig } = useDoc<any>('config/tenant_details');

  const [signatoryName, setSignatoryName] = useState('');
  const [signatureUrl, setSignatureUrl] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tenantConfig) {
      setSignatoryName(tenantConfig.signatoryName || '');
      setSignatureUrl(tenantConfig.signatureUrl || '');
    }
  }, [tenantConfig]);

  const compressImage = (file: File, maxWidth = 600, maxHeight = 300): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = Math.round((height * maxWidth) / width);
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = Math.round((width * maxHeight) / height);
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error("Erro ao comprimir imagem"));
            }
          }, 'image/png', 0.90);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !storage) return;

    setIsUploading(true);
    try {
      const compressedBlob = await compressImage(file);
      const filePath = `signatures/global_pastor_signature.png`;
      const fileRef = ref(storage, filePath);

      await uploadBytes(fileRef, compressedBlob);
      const downloadUrl = await getDownloadURL(fileRef);

      setSignatureUrl(downloadUrl);
      toast({
        title: "Assinatura Enviada!",
        description: "A assinatura global foi carregada com sucesso. Salve para confirmar.",
      });
    } catch (error: any) {
      console.error("Erro no upload da assinatura:", error);
      toast({
        variant: "destructive",
        title: "Erro no upload",
        description: error.message || "Não foi possível carregar o arquivo.",
      });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async () => {
    if (!firestore) return;
    setIsSaving(true);

    try {
      await setDoc(doc(firestore, 'config', 'tenant_details'), {
        signatoryName,
        signatureUrl,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      toast({
        title: "Configurações Salvas!",
        description: "As informações do certificado foram atualizadas com sucesso.",
      });
    } catch (error: any) {
      console.error("Erro ao salvar configurações do certificado:", error);
      toast({
        variant: "destructive",
        title: "Erro ao salvar",
        description: error.message || "Tente novamente mais tarde.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (loadingConfig) {
    return <div className="flex justify-center p-4"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="signatory-name" className="text-xs font-black uppercase text-muted-foreground tracking-wider">
            Nome do Signatário (Pastor Sênior)
          </Label>
          <Input
            id="signatory-name"
            placeholder="Ex: Pr. João da Silva"
            value={signatoryName}
            onChange={(e) => setSignatoryName(e.target.value)}
            className="h-11 font-bold"
          />
          <p className="text-[10px] text-muted-foreground">
            Este nome aparecerá diretamente abaixo da linha de assinatura no certificado de conclusão.
          </p>
        </div>

        <div className="space-y-2">
          <Label className="text-xs font-black uppercase text-muted-foreground tracking-wider block">
            Carregar Assinatura Digitalizada
          </Label>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleSignatureUpload}
            accept="image/png, image/jpeg"
            className="hidden"
          />
          <Button
            type="button"
            variant="outline"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-11 border-dashed hover:bg-slate-50"
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando arquivo...
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4 text-primary" /> Selecionar Imagem (PNG/JPG)
              </>
            )}
          </Button>
          <p className="text-[10px] text-muted-foreground">
            Recomendamos utilizar uma imagem em formato PNG com fundo transparente.
          </p>
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving || isUploading}
          className="w-full h-11 font-black uppercase tracking-widest mt-4 shadow-md"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" /> Salvar Configurações
            </>
          )}
        </Button>
      </div>

      <div className="flex flex-col justify-center items-center p-6 bg-slate-50/50 rounded-xl border border-dashed min-h-[220px]">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-4">Pré-visualização da Assinatura</span>
        {signatureUrl ? (
          <div className="bg-white p-4 rounded-lg shadow-sm border max-w-full flex flex-col items-center justify-center">
            <img
              src={signatureUrl}
              alt="Assinatura Digitalizada"
              className="max-h-24 max-w-[240px] object-contain"
            />
            <div className="w-40 border-t border-slate-300 mt-2 pt-1 text-center">
              <p className="text-[10px] font-black uppercase text-slate-800 leading-none truncate">{signatoryName || 'Nome do Pastor'}</p>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Assinatura Autorizada</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-6 text-muted-foreground flex flex-col items-center">
            <Award className="size-10 text-slate-300 mb-2" />
            <p className="text-xs font-bold">Nenhuma assinatura carregada</p>
            <p className="text-[10px] max-w-xs mt-1">Carregue uma imagem de assinatura para habilitar a geração de certificados válidos.</p>
          </div>
        )}
      </div>
    </div>
  );
}
