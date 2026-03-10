
'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Input } from '@/components/ui/input';

interface GooglePlacesAutocompleteProps {
  defaultValue?: string;
  onAddressSelect: (place: any) => void;
  className?: string;
}

export function GooglePlacesAutocomplete({
  defaultValue = '',
  onAddressSelect,
  className,
}: GooglePlacesAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [inputValue, setInputValue] = useState(defaultValue);

  useEffect(() => {
    // Casting window to any to access google global without TS errors if types are missing
    const win = window as any;
    if (!win.google || !win.google.maps || !win.google.maps.places) {
      console.warn("Google Maps script not loaded yet.");
      return;
    }

    if (!inputRef.current) {
      return;
    }

    const autocomplete = new win.google.maps.places.Autocomplete(inputRef.current, {
      componentRestrictions: { country: "br" },
      fields: ["address_components", "geometry", "icon", "name", "formatted_address"],
      types: ["address"],
    });

    const listener = autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      if (place.formatted_address) {
        setInputValue(place.formatted_address);
      }
      onAddressSelect(place);
    });

    // Cleanup the listener when the component unmounts
    return () => {
      if (win.google && win.google.maps && win.google.maps.event) {
        win.google.maps.event.removeListener(listener);
      }
      const pacContainers = document.querySelectorAll('.pac-container');
      pacContainers.forEach(container => container.remove());
    };
  }, [onAddressSelect]);

  useEffect(() => {
    setInputValue(defaultValue);
  }, [defaultValue]);

  return (
    <Input
      ref={inputRef}
      value={inputValue}
      onChange={(e) => setInputValue(e.target.value)}
      placeholder="Digite o endereço da célula..."
      className={className}
    />
  );
}
