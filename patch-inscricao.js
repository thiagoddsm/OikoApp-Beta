const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/app/inscricao/[slug]/page.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Update active ticket filtering logic in useEffect (auto-select)
const oldUseEffectRegex = /const active = tickets\.filter\(\(t: any\) => t\.isActive !== false\);/;
const newUseEffect = `const active = tickets.filter((t: any) => {
              const isSoldOut = t.limit && t.limit > 0 && t.soldCount >= t.limit;
              const isClosed = t.endDate && new Date(t.endDate) < new Date();
              return t.isActive !== false && !isSoldOut && !isClosed;
            });`;

content = content.replace(oldUseEffectRegex, newUseEffect);

// 2. Update tickets definition to include soldOut/isClosed calculation? We can do it inside map.
const oldMapRegex = /\{tickets\.map\(\(t: any\) => \{\s*const isSelected = selectedTicketId === t\.id;\s*const price = Number\(t\.price\) \|\| 0;\s*return \([\s\S]*?<\/div>\s*\}\)\}/;

const newMap = `{tickets.map((t: any) => {
                    const isSelected = selectedTicketId === t.id;
                    const price = Number(t.price) || 0;
                    const isSoldOut = t.limit && t.limit > 0 && t.soldCount >= t.limit;
                    const isClosed = t.endDate && new Date(t.endDate) < new Date();
                    const isDisabled = isSoldOut || isClosed;

                    return (
                      <div
                        key={t.id}
                        onClick={() => { if (!isDisabled) setSelectedTicketId(t.id); }}
                        className={\`p-4 rounded-2xl border transition-all flex flex-col justify-between \${
                          isDisabled
                            ? 'opacity-50 cursor-not-allowed bg-slate-900/20 border-slate-800'
                            : isSelected
                            ? 'bg-primary/10 border-primary shadow-lg shadow-primary/10 ring-1 ring-primary cursor-pointer'
                            : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 cursor-pointer'
                        }\`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-bold text-sm text-white flex flex-col items-start gap-1">
                            {t.name}
                            <div className="flex items-center gap-1">
                              {isSoldOut && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full font-black">ESGOTADO</span>}
                              {isClosed && !isSoldOut && <span className="text-[10px] bg-slate-500/20 text-slate-400 px-2 py-0.5 rounded-full font-black">ENCERRADO</span>}
                            </div>
                          </h4>
                          <span className="font-black text-sm text-emerald-400">
                            {price === 0 ? 'Gratuito' : \`R$ \${price.toFixed(2)}\`}
                          </span>
                        </div>
                        {t.description && (
                          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed">{t.description}</p>
                        )}
                        
                        <div className="mt-4 pt-3 border-t border-slate-800/50 flex justify-end">
                          <span className={\`text-[10px] uppercase font-bold \${isSelected ? 'text-primary' : 'text-slate-600'}\`}>
                            {isSelected ? '✓ Selecionado' : isDisabled ? 'Indisponível' : 'Selecionar'}
                          </span>
                        </div>
                      </div>
                    );
                  })}`;

content = content.replace(oldMapRegex, newMap);

fs.writeFileSync(filePath, content, 'utf8');
console.log('inscricao page patched');
