import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatPhone(phone: string | number | undefined): string {
    if (!phone) return '-';
    const cleaned = String(phone).replace(/\D/g, '');
    
    if (cleaned.length === 11) {
        return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
    }
    if (cleaned.length === 10) {
        return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
    }
    return String(phone);
}

export function formatCPF(cpf: string | number | undefined): string {
    if (!cpf) return '-';
    const cleaned = String(cpf).replace(/\D/g, '');
    if (cleaned.length === 11) {
        return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
    }
    return String(cpf);
}

export function formatName(name: string): string {
    if (!name) return "";
    const lowercaseWords = ["de", "di", "da", "do", "dos", "das", "e", "o", "a", "em", "para"];
    return name
        .trim()
        .toLowerCase()
        .split(/\s+/)
        .map((word, index) => {
            if (index > 0 && lowercaseWords.includes(word)) {
                return word;
            }
            return word.charAt(0).toUpperCase() + word.slice(1);
        })
        .join(" ");
}
