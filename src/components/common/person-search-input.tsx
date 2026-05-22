'use client';

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';

export type UserType = {
  id: string;
  name: string;
  avatar?: string;
  photoURL?: string;
  hierarchy?: { role?: string; };
};

interface PersonSearchInputProps {
  value: string;
  onChange: (id: string) => void;
  users: UserType[];
  excludeIds?: string[];
  placeholder?: string;
  optional?: boolean;
  suggestions?: UserType[];
}

export function PersonSearchInput({
  value,
  onChange,
  users = [],
  excludeIds = [],
  placeholder = 'Buscar...',
  optional = false,
  suggestions = []
}: PersonSearchInputProps) {
  const [search, setSearch] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = useMemo(() => users.find(u => u.id === value), [users, value]);

  // Click outside handler
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredResults = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      // Return suggestions if no search term, excluding already excludedIds or selected value
      return suggestions.filter(u => !excludeIds.includes(u.id) && u.id !== value);
    }
    return users
      .filter(u => !excludeIds.includes(u.id) && u.id !== value && u.name?.toLowerCase().includes(term))
      .slice(0, 15);
  }, [search, users, excludeIds, suggestions, value]);

  if (selected) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg border bg-muted/30 w-full">
        <Avatar className="h-6 w-6 flex-shrink-0">
          {selected.photoURL && <img src={selected.photoURL} alt={selected.name} className="h-full w-full object-cover rounded-full" />}
          <AvatarFallback className="text-[10px] font-bold">{selected.name?.charAt(0)}</AvatarFallback>
        </Avatar>
        <span className="text-sm font-semibold flex-1 truncate">{selected.name}</span>
        <button
          type="button"
          onClick={() => {
            onChange('');
            setSearch('');
            setIsOpen(true);
          }}
          className="text-muted-foreground hover:text-destructive ml-1 text-xs font-bold animate-in fade-in"
        >
          ✕
        </button>
      </div>
    );
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      <Input
        placeholder={placeholder}
        value={search}
        onChange={e => {
          setSearch(e.target.value);
          setIsOpen(true);
        }}
        onFocus={() => setIsOpen(true)}
        className="h-9 w-full"
      />
      {isOpen && (
        <div className="absolute left-0 right-0 top-full mt-1 z-50 border rounded-lg bg-background shadow-lg overflow-hidden max-h-[220px] flex flex-col animate-in fade-in slide-in-from-top-1 duration-100">
          <ScrollArea className="flex-1">
            <div className="p-1">
              {!search.trim() && suggestions.length > 0 && (
                <div className="text-[9px] font-black text-muted-foreground px-2 py-1.5 uppercase tracking-widest bg-muted/50 rounded-sm mb-1">
                  Sugestões (Líderes)
                </div>
              )}
              {filteredResults.length > 0 ? (
                filteredResults.map(u => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      onChange(u.id);
                      setSearch('');
                      setIsOpen(false);
                    }}
                    className="flex items-center gap-2 w-full px-3 py-2 hover:bg-primary/5 hover:text-primary rounded-sm text-left text-sm transition-colors group"
                  >
                    <Avatar className="h-5 w-5 flex-shrink-0 group-hover:scale-105 transition-transform">
                      {u.photoURL && <img src={u.photoURL} alt={u.name} className="h-full w-full object-cover rounded-full" />}
                      <AvatarFallback className="text-[10px] font-bold">{u.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col flex-1 overflow-hidden">
                      <span className="truncate font-semibold text-slate-800 group-hover:text-primary transition-colors">{u.name}</span>
                      {u.hierarchy?.role && (
                        <span className="text-[9px] text-muted-foreground uppercase leading-none mt-0.5">
                          {u.hierarchy.role.replace('_', ' ')}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              ) : (
                <p className="text-xs text-muted-foreground p-3 text-center">
                  {search.trim() ? `Nenhum resultado para "${search}"` : 'Digite para buscar...'}
                </p>
              )}
            </div>
          </ScrollArea>
          {!search.trim() && !suggestions.length && (
            <div className="text-[10px] text-muted-foreground p-2 border-t text-center bg-muted/10">
              Digite para buscar{optional ? ' (opcional)' : ''}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
