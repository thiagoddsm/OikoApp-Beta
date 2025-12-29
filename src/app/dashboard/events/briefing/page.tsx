
'use client';

import React, { useState, useEffect } from 'react';
import { Church, Clapperboard, Info, List, Music, Groups, ClipboardList, LocalShipping, Image as ImageIcon, Sync, Edit, Eye, Print, Code, X, ChevronUp, ChevronDown, Trash2, Plus, Restaurant, Speaker, Check, FileCopy, CheckCircle, TheaterComedy } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

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
      midia: "- Haverá thumb específica para projeção?\\n- Haverá slide na pregação?",
      musica: "- Banda posicionada: 21:00\\n- Música ambiente (Spotify): 21:10",
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

const SectionHeader = ({ icon: Icon, title, action }) => (
    <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100">
        <h3 className="font-bold text-gray-700 flex items-center gap-2">
            <Icon className="text-brand-600 size-5" />
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


export default function BriefingProPage() {
    const [viewMode, setViewMode] = useState('split');
    const [data, setData] = useState(TEMPLATE_CULTO);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) setViewMode('edit');
            else setViewMode('split');
        };
        window.addEventListener('resize', handleResize);
        handleResize(); 
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const switchTemplate = (type) => {
        if (confirm("Trocar de template irá perder as alterações não salvas. Continuar?")) {
            setData(type === 'culto' ? TEMPLATE_CULTO : TEMPLATE_EVENTO);
        }
    };

    const updateInfo = (f, v) => setData(p => ({ ...p, info: { ...p.info, [f]: v } }));
    
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

    const renderEditor = () => (
      <div className="p-4 md:p-6 space-y-8 pb-20">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
              <SectionHeader icon={Info} title="Informações Básicas" />
              <div className="space-y-4">
                  <InputGroup label="Título do Evento">
                      <Input value={data.info.titulo} onChange={e => updateInfo('titulo', e.target.value)} />
                  </InputGroup>
                  <InputGroup label="Tema / Slogan">
                      <Input value={data.info.tema} onChange={e => updateInfo('tema', e.target.value)} />
                  </InputGroup>
                  <div className="grid grid-cols-2 gap-4">
                      <InputGroup label="Data"><Input type="date" value={data.info.data} onChange={e => updateInfo('data', e.target.value)} /></InputGroup>
                      <InputGroup label="Horário"><Input type="time" value={data.info.horario} onChange={e => updateInfo('horario', e.target.value)} /></InputGroup>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                      <InputGroup label="Local"><Input value={data.info.local} onChange={e => updateInfo('local', e.target.value)} /></InputGroup>
                      {data.type === 'culto' && <InputGroup label="Pregador"><Input value={data.info.pregador} onChange={e => updateInfo('pregador', e.target.value)} /></InputGroup>}
                  </div>
                  {data.type === 'evento' && <InputGroup label="Descrição"><Textarea value={data.info.descricao} onChange={e => updateInfo('descricao', e.target.value)} /></InputGroup>}
              </div>
          </div>

          {data.type === 'culto' ? (
              <>
                  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                      <SectionHeader icon={List} title="Liturgia (Ordem)" action={ <Button size="sm" onClick={() => setData(p => ({...p, liturgia: [...p.liturgia, {id: Date.now(), momento: "", responsavel: "", obs: ""}]}))}><Plus className="mr-2 size-4" /> Adicionar</Button> } />
                      <div className="space-y-3">
                          {data.liturgia.map((item, idx) => (
                              <div key={item.id} className="group bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 p-2 rounded-lg transition-shadow shadow-sm hover:shadow-md flex gap-2 items-start">
                                  <div className="flex flex-col gap-1 mt-1 text-gray-300">
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveItem('liturgia', idx, -1)}><ChevronUp className="size-4"/></Button>
                                      <span className="text-xs font-mono text-center font-bold text-gray-400 h-6 flex items-center justify-center">{idx+1}</span>
                                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => moveItem('liturgia', idx, 1)}><ChevronDown className="size-4"/></Button>
                                  </div>
                                  <div className="flex-1 grid grid-cols-1 md:grid-cols-12 gap-2">
                                      <div className="md:col-span-4"><Input placeholder="Momento" value={item.momento} onChange={e => updateItem('liturgia', item.id, 'momento', e.target.value)} /></div>
                                      <div className="md:col-span-3"><Input placeholder="Responsável" value={item.responsavel} onChange={e => updateItem('liturgia', item.id, 'responsavel', e.target.value)} /></div>
                                      <div className="md:col-span-5"><Input placeholder="Obs / Detalhes" value={item.obs} onChange={e => updateItem('liturgia', item.id, 'obs', e.target.value)} /></div>
                                  </div>
                                  <Button variant="ghost" size="icon" className="text-gray-400 hover:text-red-500 h-8 w-8" onClick={() => removeItem('liturgia', item.id)}><Trash2 className="size-4"/></Button>
                              </div>
                          ))}
                      </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                      <SectionHeader icon={Music} title="Setlist de Louvor" action={<Button size="sm" onClick={() => setData(p => ({...p, louvor: [...p.louvor, {id: Date.now(), musica: "", tom: "", cantor: ""}]}))}><Plus className="mr-2 size-4" /> Adicionar</Button>} />
                      <div className="space-y-2">
                          {data.louvor.map((item, idx) => (
                              <div key={item.id} className="flex gap-2 items-center bg-gray-50 p-2 rounded-lg border border-gray-100">
                                  <span className="w-6 text-center text-xs font-bold text-gray-400">{idx+1}</span>
                                  <Input placeholder="Música" className="flex-1" value={item.musica} onChange={e => updateItem('louvor', item.id, 'musica', e.target.value)} />
                                  <Input placeholder="Tom" className="w-16 text-center" value={item.tom} onChange={e => updateItem('louvor', item.id, 'tom', e.target.value)} />
                                  <Input placeholder="Cantor(a)" className="w-24" value={item.cantor} onChange={e => updateItem('louvor', item.id, 'cantor', e.target.value)} />
                                  <Button variant="ghost" size="icon" className="h-6 w-6 text-gray-400 hover:text-red-500" onClick={() => removeItem('louvor', item.id)}><X className="size-4"/></Button>
                              </div>
                          ))}
                      </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                      <SectionHeader icon={Groups} title="Escala de Equipes" />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {Object.keys(data.equipes).map(role => ( <div key={role}><Label className="text-xs capitalize">{role}</Label><Input value={data.equipes[role]} onChange={e => setData(p => ({...p, equipes: {...p.equipes, [role]: e.target.value}}))} /></div> ))}
                      </div>
                  </div>

                   <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                      <SectionHeader icon={ClipboardList} title="Notas Departamentais" />
                      <div className="grid grid-cols-1 gap-4">
                          {Object.keys(data.obsDepartamentos).map(dept => (
                              <div key={dept} className={`p-3 rounded-lg border ${dept === 'midia' ? 'bg-orange-50 border-orange-100' : dept === 'musica' ? 'bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-100'}`}>
                                  <Label className={`text-xs font-bold uppercase block mb-1 ${dept === 'midia' ? 'text-orange-600' : dept === 'musica' ? 'text-blue-600' : 'text-gray-600'}`}>{dept}</Label>
                                  <Textarea rows={3} className="bg-white/50 border-transparent focus:bg-white focus:border-gray-200 resize-none" value={data.obsDepartamentos[dept]} onChange={e => setData(p => ({...p, obsDepartamentos: {...p.obsDepartamentos, [dept]: e.target.value}}))} />
                              </div>
                          ))}
                      </div>
                  </div>
              </>
          ) : (
              <>
                  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                      <SectionHeader icon={List} title="Programação (Timeline)" action={<Button size="sm" onClick={() => setData(p => ({...p, programacao: [...p.programacao, {id: Date.now(), hora: "", atividade: "", detalhes: ""}]}))}>+ Item</Button>} />
                      <div className="space-y-3">
                          {data.programacao.map((item, idx) => (
                              <div key={item.id} className="flex gap-3 items-start p-3 bg-indigo-50/30 rounded-lg border border-indigo-100">
                                  <Input type="time" className="w-24 bg-white" value={item.hora} onChange={e => updateItem('programacao', item.id, 'hora', e.target.value)} />
                                  <div className="flex-1 space-y-2">
                                      <Input type="text" placeholder="Nome da Atividade" className="font-bold" value={item.atividade} onChange={e => updateItem('programacao', item.id, 'atividade', e.target.value)} />
                                      <Input type="text" placeholder="Detalhes / Local" className="text-xs" value={item.detalhes} onChange={e => updateItem('programacao', item.id, 'detalhes', e.target.value)} />
                                  </div>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500" onClick={() => removeItem('programacao', item.id)}><X className="size-4"/></Button>
                              </div>
                          ))}
                      </div>
                  </div>

                  <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
                      <SectionHeader icon={LocalShipping} title="Logística & Convidados" />
                      <div className="space-y-4">
                          <InputGroup label="Alimentação"><Textarea rows={2} value={data.logistica.alimentacao} onChange={e => setData(p => ({...p, logistica: {...p.logistica, alimentacao: e.target.value}}))} /></InputGroup>
                          <InputGroup label="Equipamentos"><Textarea rows={2} value={data.logistica.equipamentos} onChange={e => setData(p => ({...p, logistica: {...p.logistica, equipamentos: e.target.value}}))} /></InputGroup>
                      </div>
                  </div>
              </>
          )}
      </div>
  );

    const PreviewCulto = () => (
        <div className="p-8 md:p-12 relative h-full flex flex-col font-sans">
            <div className="flex flex-col md:flex-row justify-between items-start border-b-2 border-slate-900 pb-6 mb-8 gap-4">
                <div className="w-full md:w-2/3">
                    <h1 className="text-3xl md:text-4xl font-serif font-bold uppercase tracking-tight text-slate-900 leading-none mb-2">{data.info.titulo}</h1>
                    <p className="text-lg md:text-xl text-slate-600 italic font-serif">{data.info.tema}</p>
                </div>
                <div className="text-left md:text-right w-full md:w-1/3">
                    <div className="bg-slate-900 text-white inline-block px-4 py-1 mb-2 font-bold uppercase tracking-widest text-xs">Briefing de Culto</div>
                    <div className="text-xl font-bold">{new Date(data.info.data + 'T00:00:00').toLocaleDateString('pt-BR', { timeZone: 'UTC' })}</div>
                    <div className="text-lg text-slate-500">{data.info.horario}h • {data.info.local}</div>
                </div>
            </div>
            {data.info.bannerImage && <div className="w-full h-48 mb-8 overflow-hidden rounded-lg shadow-sm border"><img src={data.info.bannerImage} alt="Theme Banner" className="w-full h-full object-cover" /></div>}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 flex-1">
                <div className="lg:col-span-4 space-y-8 lg:border-r lg:border-slate-100 lg:pr-6">
                    <div className="bg-slate-50 p-5 rounded-lg border">
                        <h3 className="font-bold uppercase text-xs text-slate-400 mb-4 tracking-wider">Liderança & Púlpito</h3>
                        <div className="space-y-3">
                            <div><span className="block text-xs text-slate-400 uppercase">Pregador</span><span className="font-bold text-slate-800 text-lg">{data.info.pregador || "-"}</span></div>
                            <div><span className="block text-xs text-slate-400 uppercase">Dirigente</span><span className="font-medium text-slate-700">{data.info.dirigente || "-"}</span></div>
                        </div>
                    </div>
                    <div>
                        <h3 className="font-bold text-slate-900 uppercase text-sm border-b-2 border-slate-200 pb-2 mb-4">Escala Técnica</h3>
                        <ul className="text-sm space-y-3">{Object.entries(data.equipes).map(([key, value]) => <li key={key} className="flex flex-col"><span className="capitalize text-slate-400 text-xs font-bold">{key}</span><span className="font-semibold text-slate-700">{value || "-"}</span></li>)}</ul>
                    </div>
                    <div>
                        <h3 className="font-bold uppercase text-sm border-b-2 border-indigo-600 text-indigo-900 pb-2 mb-4">Louvor (Setlist)</h3>
                        <ul className="space-y-3">{data.louvor.map((musica, i) => <li key={i} className="flex items-center gap-3"><span className="bg-indigo-50 text-indigo-700 font-bold text-xs w-6 h-6 flex items-center justify-center rounded-full shrink-0">{i+1}</span><div className="leading-tight"><div className="font-bold text-sm text-slate-800">{musica.musica}</div><div className="text-xs text-slate-400">{musica.cantor} {musica.tom && `• Tom: ${musica.tom}`}</div></div></li>)}</ul>
                    </div>
                </div>
                <div className="lg:col-span-8 space-y-8">
                    <div>
                        <h3 className="font-bold uppercase text-sm border-b-2 border-slate-900 pb-2 mb-4 flex justify-between items-center"><span>Ordem do Culto</span><span className="text-xs bg-slate-100 px-2 py-1 rounded text-slate-500 font-normal">Minuto a Minuto</span></h3>
                        <div className="relative border-l-2 border-slate-200 ml-2 space-y-0">{data.liturgia.map((item, i) => <div key={i} className="ml-6 relative py-2 group"><div className="absolute -left-[31px] top-4 bg-white border-2 border-slate-300 w-4 h-4 rounded-full group-first:bg-slate-900 group-first:border-slate-900 group-last:bg-red-500 group-last:border-red-500"></div><div className="flex justify-between items-baseline border-b border-slate-100 pb-2 mb-2"><div><span className="font-bold text-slate-800 text-base mr-3">{item.momento}</span><span className="text-sm text-slate-500">{item.responsavel}</span></div></div><div className="text-xs text-slate-400 italic bg-slate-50 inline-block px-2 py-1 rounded">{item.obs || "..."}</div></div>)}</div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8 bg-slate-50 p-6 rounded-xl border border-slate-200 break-inside-avoid">
                        <div className="col-span-1 sm:col-span-2 mb-1 border-b border-slate-200 pb-2"><h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider">Notas Departamentais</h4></div>
                        {data.obsDepartamentos.midia && <div className="text-xs"><strong className="text-orange-600 block mb-1 uppercase">Mídia</strong><p className="text-slate-600 whitespace-pre-line leading-relaxed">{data.obsDepartamentos.midia}</p></div>}
                        {data.obsDepartamentos.musica && <div className="text-xs"><strong className="text-blue-600 block mb-1 uppercase">Música</strong><p className="text-slate-600 whitespace-pre-line leading-relaxed">{data.obsDepartamentos.musica}</p></div>}
                        {data.obsDepartamentos.staff && <div className="text-xs"><strong className="text-green-600 block mb-1 uppercase">Staff</strong><p className="text-slate-600 whitespace-pre-line leading-relaxed">{data.obsDepartamentos.staff}</p></div>}
                        {data.obsDepartamentos.diaconato && <div className="text-xs"><strong className="text-purple-600 block mb-1 uppercase">Púlpito</strong><p className="text-slate-600 whitespace-pre-line leading-relaxed">{data.obsDepartamentos.diaconato}</p></div>}
                    </div>
                </div>
            </div>
            <div className="mt-auto pt-6 border-t border-slate-200 text-center text-[10px] text-slate-400 uppercase tracking-widest">Gerado por Briefing Pro • {new Date().getFullYear()}</div>
        </div>
    );

    const PreviewEvento = () => (
        <div className="p-0 relative font-sans h-full flex flex-col">
             <div className={`relative ${data.info.bannerImage ? 'h-64' : 'h-40 bg-slate-900'} w-full text-white flex flex-col justify-end p-8 overflow-hidden`}>
                {data.info.bannerImage && <><div className="absolute inset-0 bg-cover bg-center z-0" style={{backgroundImage: `url(${data.info.bannerImage})`}}></div><div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/60 to-transparent z-10"></div></>}
                <div className="relative z-20 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
                    <div>
                        <span className="bg-yellow-400 text-slate-900 text-xs font-bold px-2 py-1 uppercase tracking-widest rounded-sm mb-2 inline-block">Briefing de Evento</span>
                        <h1 className="text-3xl md:text-4xl font-extrabold leading-none">{data.info.titulo}</h1>
                        <p className="text-lg md:text-xl text-slate-300 font-light mt-1">{data.info.tema}</p>
                    </div>
                    <div className="text-left md:text-right border-t md:border-t-0 md:border-l border-white/20 pt-2 md:pt-0 md:pl-6">
                        <div className="font-bold text-xl">{data.info.horario}</div>
                        <div className="text-slate-300">{new Date(data.info.data).toLocaleDateString()}</div>
                    </div>
                </div>
            </div>
            <div className="p-6 md:p-10 flex-1">
                <div className="mb-8"><p className="text-lg text-slate-700 leading-relaxed font-serif italic border-l-4 border-yellow-400 pl-4 bg-slate-50 py-4 pr-4 rounded-r">"{data.info.descricao || "Sem descrição."}"</p></div>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-7">
                        <h3 className="text-sm font-bold uppercase text-indigo-600 border-b-2 border-indigo-600 pb-2 mb-6">Programação</h3>
                        <div className="space-y-6">
                            {data.programacao.map((item, i) => <div key={i} className="flex gap-4 group"><div className="w-16 text-right pt-1"><span className="block font-mono font-bold text-slate-900 text-lg leading-none">{item.hora}</span></div><div className="relative flex-1 bg-white border border-slate-100 p-4 rounded-lg shadow-sm border-l-4 border-l-indigo-500"><h4 className="font-bold text-lg text-slate-800 leading-none mb-1">{item.atividade}</h4><p className="text-slate-500 text-sm">{item.detalhes}</p></div></div>)}
                        </div>
                    </div>
                    <div className="lg:col-span-5 space-y-8">
                        <div>
                            <h3 className="text-sm font-bold uppercase text-slate-400 border-b border-slate-200 pb-2 mb-4">Logística</h3>
                            <div className="bg-slate-50 p-4 rounded-lg text-sm space-y-4 border border-slate-100">
                                {data.logistica.alimentacao && <div><strong className="block text-slate-900 mb-1 flex items-center gap-2"><Restaurant className="size-4 text-slate-400"/> Alimentação</strong><p className="text-slate-600 ml-6">{data.logistica.alimentacao}</p></div>}
                                {data.logistica.equipamentos && <div><strong className="block text-slate-900 mb-1 flex items-center gap-2"><Speaker className="size-4 text-slate-400"/> Equipamentos</strong><p className="text-slate-600 ml-6">{data.logistica.equipamentos}</p></div>}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-sm font-bold uppercase text-slate-400 border-b border-slate-200 pb-2 mb-4">Convidados</h3>
                            <ul className="space-y-3">{data.convidados.map((c, i) => <li key={i} className="flex items-start gap-3"><div className="bg-purple-100 text-purple-600 rounded-full w-8 h-8 flex items-center justify-center font-bold text-xs shrink-0">{c.nome.charAt(0)}</div><div><div className="font-bold text-slate-800">{c.nome}</div><div className="text-xs uppercase font-bold text-purple-500">{c.papel}</div><div className="text-xs text-slate-500 mt-1">{c.obs}</div></div></li>)}</ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
    
    return (
        <div className="flex flex-col h-screen bg-gray-100 text-slate-800">
             <style>{`
                .paper-view { width: 210mm; min-height: 297mm; background: white; margin: 2rem auto; }
                @media print {
                  .no-print { display: none !important; }
                  .paper-view { box-shadow: none !important; margin: 0; border: none; width: 100%; min-height: auto; }
                  @page { margin: 0; size: A4; }
                  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
                .animate-fade-in { animation: fadeIn 0.3s ease; }
                @keyframes fadeIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
            `}</style>
            <nav className="bg-slate-900 text-white h-16 shrink-0 flex items-center justify-between px-4 md:px-6 shadow-md z-50 no-print">
                <div className="flex items-center gap-3">
                    <div className="bg-gradient-to-tr from-teal-500 to-blue-600 text-white w-8 h-8 rounded-lg flex items-center justify-center shadow-lg"><Clapperboard className="size-5" /></div>
                    <div><h1 className="font-bold text-lg tracking-tight leading-none">Briefing<span className="text-teal-300">Pro</span></h1><span className="text-[10px] text-slate-400 uppercase tracking-widest">Event Planner</span></div>
                </div>
                <div className="flex items-center bg-slate-800 rounded-lg p-1 gap-1">
                    <Button onClick={() => switchTemplate('culto')} variant={data.type === 'culto' ? 'default' : 'ghost'} size="sm" className={cn(data.type === 'culto' && "bg-brand-600 text-white shadow")}> <Church className="mr-2 size-4"/> Culto</Button>
                    <Button onClick={() => switchTemplate('evento')} variant={data.type === 'evento' ? 'default' : 'ghost'} size="sm" className={cn(data.type === 'evento' && "bg-indigo-600 text-white shadow")}> <TheaterComedy className="mr-2 size-4"/> Evento</Button>
                </div>
                <div className="flex items-center gap-2 md:gap-3">
                    <div className="lg:hidden flex bg-slate-800 rounded-lg p-1">
                        <Button onClick={() => setViewMode('edit')} variant={viewMode === 'edit' ? 'secondary' : 'ghost'} size="icon"><Edit /></Button>
                        <Button onClick={() => setViewMode('preview')} variant={viewMode === 'preview' ? 'secondary' : 'ghost'} size="icon"><Eye /></Button>
                    </div>
                    <Button onClick={() => window.print()} variant="outline" className="bg-white/10 text-white hover:bg-white/20 border-white/20"> <Print className="mr-2" /> <span className="hidden sm:inline">Imprimir / PDF</span></Button>
                </div>
            </nav>
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                <div className={cn("lg:w-5/12 lg:max-w-lg border-r border-gray-200 bg-gray-50/50 overflow-y-auto no-print", viewMode === 'preview' && 'hidden lg:flex')}>
                    <div className="p-4 md:p-6 pb-0"><h2 className="text-2xl font-bold text-slate-800 mb-1">Editor</h2><p className="text-sm text-slate-500">Preencha os detalhes para gerar o documento.</p></div>
                    {renderEditor()}
                </div>
                <div className={cn("flex-1 bg-gray-200/80 overflow-y-auto p-4 md:p-8", viewMode === 'edit' && 'hidden lg:flex')}>
                    <div className="paper-view shadow-lg rounded-lg overflow-hidden">
                        {data.type === 'culto' ? <PreviewCulto /> : <PreviewEvento />}
                    </div>
                </div>
            </div>
        </div>
    );
}


