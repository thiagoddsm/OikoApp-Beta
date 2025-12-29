
'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  Church,
  Calendar,
  Pencil,
  Eye,
  Printer,
  Code,
  X,
  Copy,
  Check,
  Plus,
  ChevronUp,
  ChevronDown,
  Trash2,
  Music,
  Users,
  CheckSquare,
  Wrench
} from 'lucide-react';

// --- DATA TEMPLATES ---
const TEMPLATE_CULTO = {
  type: 'culto',
  info: {
    titulo: "Culto da Virada",
    tema: "O que almejamos para 2026?",
    data: "2025-12-31",
    horario: "21:30",
    pregador: "Pr. Hugo Campos",
    dirigente: "Louvor + Pastores",
    local: "Templo Principal",
    bannerImage: "https://images.unsplash.com/photo-1594791353343-85121401340a?q=80&w=1920"
  },
  equipes: {
    coordenador: "",
    saude: "Equipe Alpha",
    sonoplastia: "Mesa 1",
    projecao: "Multimídia",
    transmissao: "Live",
    recepcao: "Diaconato"
  },
  louvor: [
      { id: 1, musica: "Tempo de Festa", tom: "G", cantor: "Ana" },
      { id: 2, musica: "Louve", tom: "D", cantor: "Ana" },
      { id: 3, musica: "No meio dos louvores", tom: "A", cantor: "Pedro" },
      { id: 4, musica: "Algo novo vindo", tom: "E", cantor: "Pedro" },
      { id: 5, musica: "Santo Pra Sempre", tom: "C", cantor: "Todos" }
  ],
  liturgia: [
      { id: 1, momento: "Cronômetro", responsavel: "Mídia", obs: "21:25 (5 min)" },
      { id: 2, momento: "Abertura / Louvor", responsavel: "Min. Louvor", obs: "21:30 - Tempo de festa, Louve" },
      { id: 3, momento: "Palavra de Gratidão", responsavel: "Pr. Juliano", obs: "21:45" },
      { id: 4, momento: "Vídeo Retrospectiva", responsavel: "Mídia", obs: "21:50 - Confirmar arquivo" },
      { id: 5, momento: "Louvor", responsavel: "Min. Louvor", obs: "21:55 - Algo novo, Santo pra sempre" },
      { id: 6, momento: "Reflexão", responsavel: "Pr. Marcio", obs: "22:10" },
      { id: 7, momento: "A VIRADA", responsavel: "Todos", obs: "23:59 - Contagem" }
  ],
  obsDepartamentos: {
      midia: "- Haverá thumb específica para projeção?\n- Haverá slide na pregação?",
      musica: "- Banda posicionada: 21:00\n- Música ambiente (Spotify): 21:10",
      staff: "- Coordenador geral definido?",
      diaconato: "- Água e microfone para pregadores."
  }
};
const TEMPLATE_EVENTO = {
  type: 'evento',
  info: {
    titulo: "Conferência Criativamente",
    tema: "Ideias do Céu",
    data: new Date().toISOString().split('T')[0],
    horario: "14:00",
    local: "Auditório & Hall",
    descricao: "Um encontro dedicado a despertar, ativar e celebrar a criatividade. Nosso propósito é proporcionar um ambiente de inspiração.",
    bannerImage: "https://images.unsplash.com/photo-1516534775068-ba3e7458af70?q=80&w=1920"
  },
  programacao: [
      { id: 1, hora: "14:00", atividade: "Oficinas | Criativos em Ação", detalhes: "Conteúdos práticos (Salas 1-3)" },
      { id: 2, hora: "17:00", atividade: "Coffee Break", detalhes: "Hall Principal" },
      { id: 3, hora: "19:00", atividade: "Celebração Final", detalhes: "Auditório Principal" }
  ],
  convidados: [
      { id: 1, nome: "Fulano de Tal", papel: "Palestrante", obs: "Chegada 13h." },
      { id: 2, nome: "Banda Guest", papel: "Música", obs: "Soundcheck 16h." }
  ],
  logistica: {
    alimentacao: "Coffee break para 200 pessoas.",
    equipamentos: "Telão de LED, 4 Microfones sem fio.",
    staff: "Chegada da equipe às 12h."
  }
};


// --- COMPONENTS ---

const Icon = ({ icon: IconComponent, size = "text-base", className = "" }) => (
    <IconComponent className={`${size} ${className} select-none align-middle`} />
);
const SectionHeader = ({ icon, title, action }) => (
    <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
        <h3 className="font-bold text-gray-700 flex items-center gap-2">
            <Icon icon={icon} className="text-brand-600" />
            {title}
        </h3>
        {action}
    </div>
);
const InputGroup = ({ label, children }) => (
    <div className="mb-3">
        <label className="block text-xs font-bold text-gray-500 uppercase mb-1 tracking-wide">{label}</label>
        {children}
    </div>
);

// --- APP ---

export default function BriefingProPage() {
    const [viewMode, setViewMode] = useState('split'); // 'split', 'edit', 'preview'
    const [data, setData] = useState(TEMPLATE_CULTO);

    // Responsive Handler
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) setViewMode('edit');
            else setViewMode('split');
        };
        window.addEventListener('resize', handleResize);
        handleResize(); // Init
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const switchTemplate = (type) => {
        if (confirm("Trocar de template irá perder as alterações não salvas. Continuar?")) {
            setData(type === 'culto' ? TEMPLATE_CULTO : TEMPLATE_EVENTO);
        }
    };

    // Generic Updaters
    const updateInfo = (f, v) => setData(p => ({ ...p, info: { ...p.info, [f]: v } }));
    
    // List Helpers
    const removeItem = (listKey, id) => setData(p => ({ ...p, [listKey]: p[listKey].filter(i => i.id !== id) }));
    const updateItem = (listKey, id, f, v) => setData(p => ({ ...p, [listKey]: p[listKey].map(i => i.id === id ? { ...i, [f]: v } : i) }));
    const moveItem = (listKey, index, direction) => {
        const newList = [...data[listKey]];
        if (direction === -1 && index > 0) {
            [newList[index], newList[index-1]] = [newList[index-1], newList[index]];
        } else if (direction === 1 && index < newList.length - 1) {
            [newList[index], newList[index+1]] = [newList[index+1], newList[index]];
        }
        setData(p => ({ ...p, [listKey]: newList }));
    };

    // --- RENDERERS ---

    const renderEditor = () => (
      <div className="p-6 space-y-8 animate-fade-in pb-20">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <SectionHeader icon={Wrench} title="Informações Básicas" />
              <div className="space-y-4">
                  <InputGroup label="Título do Evento">
                      <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none transition" value={data.info.titulo} onChange={e => updateInfo('titulo', e.target.value)} />
                  </InputGroup>
                  
                  <InputGroup label="Tema / Slogan">
                      <div className="flex gap-2">
                          <input type="text" className="flex-1 bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm focus:ring-2 focus:ring-brand-500 outline-none" value={data.info.tema} onChange={e => updateInfo('tema', e.target.value)} />
                      </div>
                  </InputGroup>

                  <div className="grid grid-cols-2 gap-4">
                      <InputGroup label="Data">
                          <input type="date" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm" value={data.info.data} onChange={e => updateInfo('data', e.target.value)} />
                      </InputGroup>
                      <InputGroup label="Horário">
                          <input type="time" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm" value={data.info.horario} onChange={e => updateInfo('horario', e.target.value)} />
                      </InputGroup>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                      <InputGroup label="Local">
                          <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm" value={data.info.local} onChange={e => updateInfo('local', e.target.value)} />
                      </InputGroup>
                      {data.type === 'culto' && (
                          <InputGroup label="Pregador">
                              <input type="text" className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm" value={data.info.pregador} onChange={e => updateInfo('pregador', e.target.value)} />
                          </InputGroup>
                      )}
                  </div>

                  {data.type === 'evento' && (
                      <InputGroup label="Descrição">
                          <textarea className="w-full bg-gray-50 border border-gray-200 rounded-lg p-2.5 text-sm h-24" value={data.info.descricao} onChange={e => updateInfo('descricao', e.target.value)}></textarea>
                      </InputGroup>
                  )}
              </div>
          </div>

          {data.type === 'culto' ? (
              <>
                  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                      <SectionHeader icon={Calendar} title="Liturgia (Ordem)" action={
                          <button onClick={() => setData(p => ({...p, liturgia: [...p.liturgia, {id: Date.now(), momento: "", responsavel: "", obs: ""}]}))} className="text-xs bg-brand-50 text-brand-700 px-3 py-1.5 rounded-full hover:bg-brand-100 font-bold transition flex items-center gap-1">
                              <Icon icon={Plus} size="text-sm" /> Adicionar
                          </button>
                      } />
                      <div className="space-y-3">
                          {data.liturgia.map((item, idx) => (
                              <div key={item.id} className="group bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 p-3 rounded-lg transition shadow-sm hover:shadow-md flex gap-2 items-start">
                                  <div className="flex flex-col gap-1 mt-1 text-gray-300">
                                      <button onClick={() => moveItem('liturgia', idx, -1)} className="hover:text-brand-500"><Icon icon={ChevronUp} size="text-sm"/></button>
                                      <span className="text-xs font-mono text-center font-bold text-gray-400">{idx+1}</span>
                                      <button onClick={() => moveItem('liturgia', idx, 1)} className="hover:text-brand-500"><Icon icon={ChevronDown} size="text-sm"/></button>
                                  </div>
                                  <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2">
                                      <div className="md:col-span-4"><input placeholder="Momento" className="w-full border rounded p-2 text-sm font-semibold" value={item.momento} onChange={e => updateItem('liturgia', item.id, 'momento', e.target.value)} /></div>
                                      <div className="md:col-span-3"><input placeholder="Responsável" className="w-full border rounded p-2 text-sm" value={item.responsavel} onChange={e => updateItem('liturgia', item.id, 'responsavel', e.target.value)} /></div>
                                      <div className="md:col-span-5"><input placeholder="Obs / Detalhes" className="w-full border rounded p-2 text-sm text-gray-600" value={item.obs} onChange={e => updateItem('liturgia', item.id, 'obs', e.target.value)} /></div>
                                  </div>
                                  <button onClick={() => removeItem('liturgia', item.id)} className="text-gray-300 hover:text-red-500 p-2"><Icon icon={Trash2} /></button>
                              </div>
                          ))}
                      </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                      <SectionHeader icon={Music} title="Setlist de Louvor" action={
                          <button onClick={() => setData(p => ({...p, louvor: [...p.louvor, {id: Date.now(), musica: "", tom: "", cantor: ""}]}))} className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full hover:bg-indigo-100 font-bold transition flex items-center gap-1">
                              <Icon icon={Plus} size="text-sm" /> Adicionar
                          </button>
                      } />
                      <div className="space-y-2">
                          {data.louvor.map((item, idx) => (
                              <div key={item.id} className="flex gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                                  <span className="w-6 text-center text-xs font-bold text-gray-400">{idx+1}</span>
                                  <input placeholder="Música" className="flex-1 border rounded p-1.5 text-sm font-medium" value={item.musica} onChange={e => updateItem('louvor', item.id, 'musica', e.target.value)} />
                                  <input placeholder="Tom" className="w-16 border rounded p-1.5 text-sm text-center" value={item.tom} onChange={e => updateItem('louvor', item.id, 'tom', e.target.value)} />
                                  <input placeholder="Cantor(a)" className="w-24 border rounded p-1.5 text-sm" value={item.cantor} onChange={e => updateItem('louvor', item.id, 'cantor', e.target.value)} />
                                  <button onClick={() => removeItem('louvor', item.id)} className="text-gray-300 hover:text-red-500 px-2"><Icon icon={X} size="text-sm"/></button>
                              </div>
                          ))}
                      </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                      <SectionHeader icon={Users} title="Escala de Equipes" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Object.keys(data.equipes).map(role => (
                              <div key={role} className="flex flex-col">
                                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1">{role}</label>
                                  <input type="text" className="border rounded p-2 text-sm" value={data.equipes[role]} onChange={e => setData(p => ({...p, equipes: {...p.equipes, [role]: e.target.value}}))} />
                              </div>
                          ))}
                      </div>
                  </div>

                   <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                      <SectionHeader icon={CheckSquare} title="Notas Departamentais" />
                      <div className="grid grid-cols-1 gap-4">
                          {Object.keys(data.obsDepartamentos).map(dept => (
                              <div key={dept} className={`p-3 rounded-lg border ${dept === 'midia' ? 'bg-orange-50 border-orange-100' : dept === 'musica' ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}>
                                  <label className={`text-xs font-bold uppercase block mb-1 ${dept === 'midia' ? 'text-orange-600' : dept === 'musica' ? 'text-blue-600' : 'text-gray-600'}`}>{dept}</label>
                                  <textarea rows="3" className="w-full bg-white/50 border border-transparent focus:bg-white focus:border-gray-200 rounded p-2 text-sm outline-none resize-none" value={data.obsDepartamentos[dept]} onChange={e => setData(p => ({...p, obsDepartamentos: {...p.obsDepartamentos, [dept]: e.target.value}}))}></textarea>
                              </div>
                          ))}
                      </div>
                  </div>
              </>
          ) : (
              <>
                  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                      <SectionHeader icon={Calendar} title="Programação (Timeline)" action={
                          <button onClick={() => setData(p => ({...p, programacao: [...p.programacao, {id: Date.now(), hora: "", atividade: "", detalhes: ""}]}))} className="text-xs bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-full hover:bg-indigo-100 font-bold transition">
                              + Item
                          </button>
                      } />
                      <div className="space-y-3">
                          {data.programacao.map((item, idx) => (
                              <div key={item.id} className="flex gap-3 items-start p-3 bg-indigo-50/30 rounded-lg border border-indigo-100">
                                  <input type="time" className="w-20 bg-white border rounded p-2 text-sm font-bold text-indigo-900" value={item.hora} onChange={e => updateItem('programacao', item.id, 'hora', e.target.value)} />
                                  <div className="flex-1 space-y-2">
                                      <input type="text" placeholder="Nome da Atividade" className="w-full bg-white border rounded p-2 text-sm font-bold" value={item.atividade} onChange={e => updateItem('programacao', item.id, 'atividade', e.target.value)} />
                                      <input type="text" placeholder="Detalhes / Local" className="w-full bg-white border rounded p-2 text-xs text-gray-600" value={item.detalhes} onChange={e => updateItem('programacao', item.id, 'detalhes', e.target.value)} />
                                  </div>
                                  <button onClick={() => removeItem('programacao', item.id)} className="text-gray-300 hover:text-red-500 pt-2"><Icon icon={X} /></button>
                              </div>
                          ))}
                      </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                      <SectionHeader icon={Wrench} title="Logística & Convidados" />
                      <div className="space-y-4">
                          <div className="grid grid-cols-1 gap-4">
                              <InputGroup label="Alimentação"><textarea rows="2" className="w-full border rounded p-2 text-sm" value={data.logistica.alimentacao} onChange={e => setData(p => ({...p, logistica: {...p.logistica, alimentacao: e.target.value}}))} /></InputGroup>
                              <InputGroup label="Equipamentos"><textarea rows="2" className="w-full border rounded p-2 text-sm" value={data.logistica.equipamentos} onChange={e => setData(p => ({...p, logistica: {...p.logistica, equipamentos: e.target.value}}))} /></InputGroup>
                          </div>
                      </div>
                  </div>
              </>
          )}
      </div>
  );

    const PreviewCulto = () => (
        <div className="p-12 relative h-full flex flex-col">
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
                <div className="w-2/3">
                    <h1 className="text-4xl font-serif font-bold uppercase tracking-tight text-slate-900 leading-none mb-2">{data.info.titulo}</h1>
                    <p className="text-xl text-slate-600 italic font-serif">{data.info.tema}</p>
                </div>
                <div className="text-right w-1/3">
                    <div className="bg-slate-900 text-white inline-block px-4 py-1 mb-2 font-bold uppercase tracking-widest text-xs">Briefing de Culto</div>
                    <div className="text-xl font-bold font-sans">{new Date(data.info.data).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</div>
                    <div className="text-lg text-slate-500 font-sans">{data.info.horario}h • {data.info.local}</div>
                </div>
            </div>

            {data.info.bannerImage && (
                <div className="w-full h-48 mb-8 overflow-hidden rounded-lg shadow-sm border border-slate-100">
                    <img src={data.info.bannerImage} alt="Theme Banner" className="w-full h-full object-cover" />
                </div>
            )}

            <div className="grid grid-cols-12 gap-10 font-sans flex-1">
                <div className="col-span-4 space-y-8 border-r border-slate-100 pr-6">
                    
                    <div className="bg-slate-50 p-5 rounded-lg border border-slate-100">
                        <h3 className="font-bold uppercase text-xs text-slate-400 mb-4 tracking-wider">Liderança &amp; Púlpito</h3>
                        <div className="space-y-3">
                            <div><span className="block text-xs text-slate-400 uppercase">Pregador</span><span className="font-bold text-slate-800 text-lg">{data.info.pregador || "-"}</span></div>
                            <div><span className="block text-xs text-slate-400 uppercase">Dirigente</span><span className="font-medium text-slate-700">{data.info.dirigente || "-"}</span></div>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-bold text-slate-900 uppercase text-sm border-b-2 border-slate-200 pb-2 mb-4">Escala Técnica</h3>
                        <ul className="text-sm space-y-3">
                            {Object.entries(data.equipes).map(([key, value]) => (
                                <li key={key} className="flex flex-col">
                                    <span className="capitalize text-slate-400 text-xs font-bold">{key}</span>
                                    <span className="font-semibold text-slate-700">{value || "-"}</span>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div>
                        <h3 className="font-bold uppercase text-sm border-b-2 border-indigo-600 text-indigo-900 pb-2 mb-4">Louvor (Setlist)</h3>
                        <ul className="space-y-3">
                            {data.louvor.map((musica, i) => (
                                <li key={i} className="flex items-center gap-3">
                                    <span className="bg-indigo-50 text-indigo-700 font-bold text-xs w-6 h-6 flex items-center justify-center rounded-full shrink-0">{i+1}</span>
                                    <div className="leading-tight">
                                        <div className="font-bold text-sm text-slate-800">{musica.musica}</div>
                                        <div className="text-xs text-slate-400">{musica.cantor} {musica.tom && `• Tom: ${musica.tom}`}</div>
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>

                <div className="col-span-8 space-y-8">
                    <div>
                        <h3 className="font-bold uppercase text-sm border-b-2 border-slate-900 pb-2 mb-4 flex justify-between items-center">
                            <span>Ordem do Culto</span>
                            <span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 font-normal">Minuto a Minuto</span>
                        </h3>
                        <div className="relative border-l-2 border-slate-200 ml-2 space-y-0">
                            {data.liturgia.map((item, i) => (
                                <div key={i} className="ml-6 relative py-2 group">
                                    <div className="absolute -left-[31px] top-4 bg-white border-2 border-slate-300 w-4 h-4 rounded-full group-first:bg-slate-900 group-first:border-slate-900 group-last:bg-red-500 group-last:border-red-500"></div>
                                    <div className="flex justify-between items-baseline border-b border-slate-100 pb-2 mb-2">
                                        <div>
                                            <span className="font-bold text-slate-800 text-base mr-3">{item.momento}</span>
                                            <span className="text-sm text-slate-500">{item.responsavel}</span>
                                        </div>
                                    </div>
                                    <div className="text-xs text-slate-400 italic bg-slate-50 inline-block px-2 py-1 rounded">{item.obs || "..."}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-8 bg-slate-50 p-6 rounded-xl border border-slate-200 break-inside-avoid">
                        <div className="col-span-2 mb-1 border-b border-slate-200 pb-2"><h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider">Notas Departamentais</h4></div>
                        {data.obsDepartamentos.midia && <div className="text-xs"><strong className="text-orange-600 block mb-1 uppercase">Mídia</strong><p className="text-slate-600 whitespace-pre-line leading-relaxed">{data.obsDepartamentos.midia}</p></div>}
                        {data.obsDepartamentos.musica && <div className="text-xs"><strong className="text-blue-600 block mb-1 uppercase">Música</strong><p className="text-slate-600 whitespace-pre-line leading-relaxed">{data.obsDepartamentos.musica}</p></div>}
                        {data.obsDepartamentos.staff && <div className="text-xs"><strong className="text-green-600 block mb-1 uppercase">Staff</strong><p className="text-slate-600 whitespace-pre-line leading-relaxed">{data.obsDepartamentos.staff}</p></div>}
                        {data.obsDepartamentos.diaconato && <div className="text-xs"><strong className="text-purple-600 block mb-1 uppercase">Púlpito</strong><p className="text-slate-600 whitespace-pre-line leading-relaxed">{data.obsDepartamentos.diaconato}</p></div>}
                    </div>
                </div>
            </div>
            
            <div className="mt-auto pt-6 border-t border-slate-200 text-center text-[10px] text-slate-400 uppercase tracking-widest">
                Gerado por Briefing Pro • {new Date().getFullYear()}
            </div>
        </div>
    );

    const PreviewEvento = () => (
        <div className="p-0 relative font-sans h-full flex flex-col">
             <div className={`relative ${data.info.bannerImage ? 'h-64' : 'h-40 bg-slate-900'} w-full text-white flex flex-col justify-end p-8 overflow-hidden`}>
                {data.info.bannerImage && (
                    <>
                        <div className="absolute inset-0 bg-cover bg-center z-0" style={{backgroundImage: `url(${data.info.bannerImage})`}}></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent z-10"></div>
                    </>
                )}
                <div className="relative z-20 flex justify-between items-end">
                    <div>
                        <span className="bg-yellow-400 text-slate-900 text-xs font-bold px-2 py-1 uppercase tracking-widest rounded-sm mb-2 inline-block">Briefing de Evento</span>
                        <h1 className="text-4xl font-extrabold leading-none">{data.info.titulo}</h1>
                        <p className="text-xl text-slate-300 font-light mt-1">{data.info.tema}</p>
                    </div>
                    <div className="text-right border-l border-white/20 pl-6">
                        <div className="font-bold text-xl">{data.info.horario}</div>
                        <div className="text-slate-300">{new Date(data.info.data).toLocaleDateString()}</div>
                        <div className="text-yellow-400 text-sm mt-1 font-medium"><Icon icon={Wrench} size="text-sm" /> {data.info.local}</div>
                    </div>
                </div>
            </div>

            <div className="p-10 flex-1">
                <div className="mb-8">
                    <p className="text-lg text-slate-700 leading-relaxed font-serif italic border-l-4 border-yellow-400 pl-4 bg-slate-50 py-4 pr-4 rounded-r">"{data.info.descricao || "Sem descrição."}"</p>
                </div>

                <div className="grid grid-cols-12 gap-10">
                    <div className="col-span-7">
                        <h3 className="text-sm font-bold uppercase text-indigo-600 border-b-2 border-indigo-600 pb-2 mb-6">Programação</h3>
                        <div className="space-y-6">
                            {data.programacao.map((item, i) => (
                                <div key={i} className="flex gap-4 group">
                                    <div className="w-16 text-right pt-1">
                                        <span className="block font-mono font-bold text-slate-900 text-lg leading-none">{item.hora}</span>
                                    </div>
                                    <div className="relative flex-1 bg-white border border-slate-100 p-4 rounded-lg shadow-sm border-l-4 border-l-indigo-500">
                                        <h4 className="font-bold text-lg text-slate-800 leading-none mb-1">{item.atividade}</h4>
                                        <p className="text-slate-500 text-sm">{item.detalhes}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="col-span-5 space-y-8">
                        <div>
                            <h3 className="text-sm font-bold uppercase text-slate-400 border-b border-slate-200 pb-2 mb-4">Logística</h3>
                            <div className="bg-slate-50 p-4 rounded-lg text-sm space-y-4 border border-slate-100">
                                {data.logistica.alimentacao && <div><strong className="block text-slate-900 mb-1 flex items-center gap-2"><Icon icon={Wrench} size="text-xs" className="text-slate-400"/> Alimentação</strong><p className="text-slate-600 ml-6">{data.logistica.alimentacao}</p></div>}
                                {data.logistica.equipamentos && <div><strong className="block text-slate-900 mb-1 flex items-center gap-2"><Icon icon={Wrench} size="text-xs" className="text-slate-400"/> Equipamentos</strong><p className="text-slate-600 ml-6">{data.logistica.equipamentos}</p></div>}
                            </div>
                        </div>
                        
                        <div>
                            <h3 className="text-sm font-bold uppercase text-slate-400 border-b border-slate-200 pb-2 mb-4">Convidados</h3>
                            <ul className="space-y-3">
                                {data.convidados.map((c, i) => (
                                    <li key={i} className="flex items-start gap-3">
                                        <div className="bg-purple-100 text-purple-600 rounded-full w-8 h-8 flex items-center justify-center font-bold text-xs shrink-0">{c.nome.charAt(0)}</div>
                                        <div>
                                            <div className="font-bold text-slate-800">{c.nome}</div>
                                            <div className="text-xs uppercase font-bold text-purple-500">{c.papel}</div>
                                            <div className="text-xs text-slate-500 mt-1">{c.obs}</div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );

    return (
        <div className="flex flex-col h-screen overflow-hidden bg-gray-100 text-slate-800">
            <style jsx>{`
                ::-webkit-scrollbar { width: 6px; height: 6px; }
                ::-webkit-scrollbar-track { background: transparent; }
                ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 3px; }
                ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                .paper-view {
                    width: 210mm;
                    min-height: 297mm;
                    background: white;
                    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06), 0 0 40px rgba(0,0,0,0.05);
                    margin: 2rem auto;
                }
                .animate-fade-in { animation: fadeIn 0.3s ease; }
                @keyframes fadeIn {
                    from { opacity: 0; transform: scale(0.95); }
                    to { opacity: 1; transform: scale(1); }
                }
            `}</style>
            <nav className="bg-slate-900 text-white h-14 shrink-0 flex items-center justify-between px-6 shadow-md z-50">
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-tr from-teal-500 to-blue-600 text-white w-8 h-8 rounded-lg flex items-center justify-center shadow-lg">
                        <Icon icon={Wrench} />
                    </div>
                    <div>
                        <h1 className="font-bold text-lg tracking-tight leading-none">Briefing<span className="text-teal-300">Pro</span></h1>
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest">Event Planner</span>
                    </div>
                </div>

                <div className="flex items-center bg-slate-800 rounded-lg p-1 gap-1">
                    <button onClick={() => switchTemplate('culto')} className={`px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition flex items-center gap-2 ${data.type === 'culto' ? 'bg-teal-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                        <Icon icon={Church} size="text-sm"/> Culto
                    </button>
                    <button onClick={() => switchTemplate('evento')} className={`px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition flex items-center gap-2 ${data.type === 'evento' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
                        <Icon icon={Wrench} size="text-sm"/> Evento
                    </button>
                </div>

                <div className="flex items-center gap-3">
                    <div className="lg:hidden flex bg-slate-800 rounded p-1">
                        <button onClick={() => setViewMode('edit')} className={`p-2 rounded ${viewMode === 'edit' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}><Icon icon={Pencil} /></button>
                        <button onClick={() => setViewMode('preview')} className={`p-2 rounded ${viewMode === 'preview' ? 'bg-slate-600 text-white' : 'text-slate-400'}`}><Icon icon={Eye} /></button>
                    </div>
                </div>
            </nav>

            <div className="flex-1 flex overflow-hidden bg-gray-100">
                <div className={`flex-1 flex flex-col min-w-0 border-r border-gray-200 bg-gray-50/50 overflow-y-auto transition-all duration-300 ${viewMode === 'preview' ? 'hidden' : 'block'} ${viewMode === 'split' ? 'w-5/12 max-w-lg' : 'w-full'}`}>
                    <div className="p-6 pb-0">
                        <h2 className="text-2xl font-bold text-slate-800 mb-1">Editor</h2>
                        <p className="text-sm text-slate-500">Preencha os detalhes para gerar o documento.</p>
                    </div>
                    {renderEditor()}
                </div>

                <div className={`flex-1 bg-gray-200/80 overflow-y-auto flex justify-center p-8 transition-all duration-300 ${viewMode === 'edit' ? 'hidden' : 'block'}`}>
                    <div className="paper-view transform transition-transform duration-300 origin-top scale-100">
                        {data.type === 'culto' ? <PreviewCulto /> : <PreviewEvento />}
                    </div>
                </div>
            </div>
        </div>
    );
}
