'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';

interface GooglePlacesAutocompleteProps {
  defaultValue?: string;
  onAddressSelect: (place: any) => void;
  className?: string;
  placeholder?: string;
}

// Reutiliza o mesmo guard global do map-view para não carregar o script duas vezes
declare global {
  interface Window {
    initGoogleMaps?: () => void;
    __gmapsLoadPromise__?: Promise<void>;
  }
}

function ensureMapsLoaded(apiKey: string): Promise<void> {
  const win = window as any;

  // Já carregou
  if (win.google?.maps?.places) return Promise.resolve();

  // Promessa já em andamento
  if (win.__gmapsLoadPromise__) return win.__gmapsLoadPromise__;

  win.__gmapsLoadPromise__ = new Promise<void>((resolve, reject) => {
    // Script já no DOM (carregado pelo MapView)
    if (document.getElementById('gmap-script')) {
      // Aguarda o callback ou polling
      const poll = setInterval(() => {
        if (win.google?.maps?.places) {
          clearInterval(poll);
          resolve();
        }
      }, 100);
      setTimeout(() => { clearInterval(poll); resolve(); }, 10000);
      return;
    }

    win.initGoogleMaps = () => {
      resolve();
      delete win.initGoogleMaps;
    };

    const s = document.createElement('script');
    s.id = 'gmap-script';
    s.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly&libraries=places&callback=initGoogleMaps`;
    s.async = true;
    s.defer = true;
    s.onerror = () => {
      win.__gmapsLoadPromise__ = null;
      reject(new Error('Falha ao carregar o Google Maps'));
    };
    document.head.appendChild(s);
  });

  return win.__gmapsLoadPromise__;
}

export function GooglePlacesAutocomplete({
  defaultValue = '',
  onAddressSelect,
  className,
  placeholder = 'Digite o endereço...',
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState(defaultValue);
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);

  // Atualiza o valor quando defaultValue muda (ex: ao abrir edição)
  useEffect(() => {
    setInputValue(defaultValue);
  }, [defaultValue]);

  // Carrega o Maps e inicializa o Autocomplete
  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey || !inputRef.current) return;

    setIsLoading(true);

    ensureMapsLoaded(apiKey)
      .then(() => {
        const win = window as any;
        if (!inputRef.current || !win.google?.maps?.places) return;

        const autocomplete = new win.google.maps.places.Autocomplete(inputRef.current, {
          componentRestrictions: { country: 'br' },
          fields: ['address_components', 'geometry', 'formatted_address', 'name'],
          types: ['address'],
        });

        const listener = autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace();
          if (place.formatted_address) setInputValue(place.formatted_address);
          onAddressSelect(place);
        });

        setIsReady(true);
        setIsLoading(false);

        return () => {
          win.google?.maps?.event?.removeListener(listener);
          document.querySelectorAll('.pac-container').forEach(el => el.remove());
        };
      })
      .catch(() => setIsLoading(false));
  }, [onAddressSelect]);

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        placeholder={placeholder}
        className={className}
        disabled={isLoading}
      />
      {isLoading && (
        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
      )}
    </div>
  );
}
