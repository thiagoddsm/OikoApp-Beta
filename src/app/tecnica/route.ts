import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const runtime = 'nodejs';

export async function GET() {
    // Try to serve from public/tecnica/index.html
    const filePath = path.join(process.cwd(), 'public', 'tecnica', 'index.html');
    
    if (fs.existsSync(filePath)) {
        const html = fs.readFileSync(filePath, 'utf-8');
        return new NextResponse(html, {
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
        });
    }

    // Fallback: redirect to briefing pro if file not found
    return new NextResponse(
        `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Técnica</title></head>
<body style="font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f3f4f6;">
<div style="text-align:center;max-width:500px;">
<h1 style="font-size:2rem;margin-bottom:1rem;">⚙️ Página Técnica</h1>
<p style="color:#666;margin-bottom:2rem;">O arquivo <code>public/tecnica/index.html</code> não foi encontrado.</p>
<p style="color:#666;">Coloque o HTML do Gestor de Culto nesse caminho e recarregue.</p>
</div>
</body></html>`,
        { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
    );
}
