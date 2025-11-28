
export default function GCLayout({
    children,
  }: {
    children: React.ReactNode;
  }) {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    
    // Injetar a chave da API nos filhos que a necessitam.
    const childrenWithApiKey = React.Children.map(children, (child) => {
      if (React.isValidElement(child)) {
        // Isso passará a apiKey como uma prop para a página renderizada (ex: MapPage)
        return React.cloneElement(child, { apiKey } as { apiKey?: string });
      }
      return child;
    });
  
    return <>{childrenWithApiKey}</>;
  }
  
import React from 'react';
