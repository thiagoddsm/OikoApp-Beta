'use client';
import React, { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle, Target, Users, UserPlus, BookOpen, Award, Calendar, Baby, Activity } from 'lucide-react';

const DashboardSaude = () => {
  // Dados simulados da célula
  const [cellData, setCellData] = useState({
    nome: 'Célula Esperança',
    lider: 'João Silva',
    supervisor: 'Pastor Carlos',
    membros: 8,
    ultimasReunioesComRelatorio: 12,
    totalReunioes: 12
  });

  // Dados para cálculo do Score de Saúde
  const [healthMetrics, setHealthMetrics] = useState({
    // Fator 1: Consistência
    relatoriosNoPrazo: 12,
    totalRelatoriosEsperados: 12,
    
    // Fator 2: Evangelismo
    visitantesUltimas4Semanas: 5,
    totalMembros: 8,
    
    // Fator 3: Engajamento
    presencaMedia: 87,
    
    // Fator 4: Discipulado
    discipulosAtivos: 3,
    
    // Fator 5: Formação
    liderTemLMSCompleto: true,
    
    // Fator 6: Multiplicação
    temDataAlvo: true,
    temProximoAnfitriao: true,
    
    // Fator 7: Saúde Kids
    temCelulaKids: true,
    temLiderKidsTrainado: true
  });

  // Cálculo do Score de Saúde (7 fatores)
  const calcularScore = () => {
    let scores = [];
    
    // Fator 1: Consistência (0-5 pontos)
    const consistencia = (healthMetrics.relatoriosNoPrazo / healthMetrics.totalRelatoriosEsperados) * 100;
    const scoreFator1 = consistencia >= 100 ? 5 : 
                        consistencia >= 85 ? 4 :
                        consistencia >= 70 ? 3 :
                        consistencia >= 50 ? 2 : 1;
    scores.push({
      nome: 'Consistência',
      descricao: 'Relatórios no prazo',
      score: scoreFator1,
      max: 5,
      percentual: consistencia,
      icon: Activity,
      cor: scoreFator1 >= 4 ? 'green' : scoreFator1 >= 3 ? 'yellow' : 'red',
      detalhes: `${healthMetrics.relatoriosNoPrazo}/${healthMetrics.totalRelatoriosEsperados} relatórios (${consistencia.toFixed(0)}%)`
    });

    // Fator 2: Evangelismo (0-5 pontos)
    const taxaVisitantes = (healthMetrics.visitantesUltimas4Semanas / healthMetrics.totalMembros) * 100;
    const scoreFator2 = taxaVisitantes >= 30 ? 5 :
                        taxaVisitantes >= 20 ? 4 :
                        taxaVisitantes >= 10 ? 3 :
                        taxaVisitantes >= 5 ? 2 : 1;
    scores.push({
      nome: 'Evangelismo',
      descricao: 'Taxa de visitantes',
      score: scoreFator2,
      max: 5,
      percentual: Math.min(taxaVisitantes, 100),
      icon: UserPlus,
      cor: scoreFator2 >= 4 ? 'green' : scoreFator2 >= 3 ? 'yellow' : 'red',
      detalhes: `${healthMetrics.visitantesUltimas4Semanas} visitantes vs ${healthMetrics.totalMembros} membros (${taxaVisitantes.toFixed(0)}%)`
    });

    // Fator 3: Engajamento (0-5 pontos)
    const scoreFator3 = healthMetrics.presencaMedia >= 85 ? 5 :
                        healthMetrics.presencaMedia >= 75 ? 4 :
                        healthMetrics.presencaMedia >= 65 ? 3 :
                        healthMetrics.presencaMedia >= 50 ? 2 : 1;
    scores.push({
      nome: 'Engajamento',
      descricao: 'Frequência média',
      score: scoreFator3,
      max: 5,
      percentual: healthMetrics.presencaMedia,
      icon: Users,
      cor: scoreFator3 >= 4 ? 'green' : scoreFator3 >= 3 ? 'yellow' : 'red',
      detalhes: `${healthMetrics.presencaMedia}% de frequência média`
    });

    // Fator 4: Discipulado (0-5 pontos)
    const scoreFator4 = healthMetrics.discipulosAtivos >= 3 ? 5 :
                        healthMetrics.discipulosAtivos >= 2 ? 4 :
                        healthMetrics.discipulosAtivos >= 1 ? 3 : 1;
    scores.push({
      nome: 'Discipulado',
      descricao: 'Relações 1-a-1',
      score: scoreFator4,
      max: 5,
      percentual: (healthMetrics.discipulosAtivos / 3) * 100,
      icon: Target,
      cor: scoreFator4 >= 4 ? 'green' : scoreFator4 >= 3 ? 'yellow' : 'red',
      detalhes: `${healthMetrics.discipulosAtivos} discípulos em acompanhamento 1-a-1`
    });

    // Fator 5: Formação (0-5 pontos)
    const scoreFator5 = healthMetrics.liderTemLMSCompleto ? 5 : 1;
    scores.push({
      nome: 'Formação',
      descricao: 'Líder capacitado',
      score: scoreFator5,
      max: 5,
      percentual: healthMetrics.liderTemLMSCompleto ? 100 : 20,
      icon: BookOpen,
      cor: scoreFator5 >= 4 ? 'green' : 'red',
      detalhes: healthMetrics.liderTemLMSCompleto ? 'Líder completou trilha de formação' : 'Líder em formação'
    });

    // Fator 6: Multiplicação (0-5 pontos)
    const scoreFator6 = (healthMetrics.temDataAlvo && healthMetrics.temProximoAnfitriao) ? 5 :
                        (healthMetrics.temDataAlvo || healthMetrics.temProximoAnfitriao) ? 3 : 1;
    scores.push({
      nome: 'Multiplicação',
      descricao: 'Visão de crescimento',
      score: scoreFator6,
      max: 5,
      percentual: scoreFator6 === 5 ? 100 : scoreFator6 === 3 ? 50 : 0,
      icon: Calendar,
      cor: scoreFator6 >= 4 ? 'green' : scoreFator6 >= 3 ? 'yellow' : 'red',
      detalhes: `Data alvo: ${healthMetrics.temDataAlvo ? '✓' : '✗'} | Próximo anfitrião: ${healthMetrics.temProximoAnfitriao ? '✓' : '✗'}`
    });

    // Fator 7: Saúde Kids (0-5 pontos)
    const scoreFator7 = (healthMetrics.temCelulaKids && healthMetrics.temLiderKidsTrainado) ? 5 :
                        healthMetrics.temCelulaKids ? 3 : 0;
    scores.push({
      nome: 'Saúde Kids',
      descricao: 'Ministério infantil',
      score: scoreFator7,
      max: 5,
      percentual: scoreFator7 === 5 ? 100 : scoreFator7 === 3 ? 50 : 0,
      icon: Baby,
      cor: scoreFator7 >= 4 ? 'green' : scoreFator7 >= 3 ? 'yellow' : 'red',
      detalhes: healthMetrics.temCelulaKids ? 
        (healthMetrics.temLiderKidsTrainado ? 'Célula kids ativa com líder treinado' : 'Célula kids sem líder treinado') :
        'Sem célula kids'
    });

    return scores;
  };

  const scores = calcularScore();
  const scoreTotal = scores.reduce((acc, s) => acc + s.score, 0);
  const scoreMaximo = scores.reduce((acc, s) => acc + s.max, 0);
  const percentualTotal = (scoreTotal / scoreMaximo) * 100;

  // Determinar cor do semáforo
  const getSemaforoStatus = () => {
    if (percentualTotal >= 80) return { cor: 'green', label: 'Saudável', emoji: '🟢', mensagem: 'Célula em excelente estado!' };
    if (percentualTotal >= 60) return { cor: 'yellow', label: 'Atenção', emoji: '🟡', mensagem: 'Célula precisa de ajustes' };
    return { cor: 'red', label: 'Crítico', emoji: '🔴', mensagem: 'Célula precisa de intervenção urgente' };
  };

  const semaforo = getSemaforoStatus();

  // Gerar alertas acionáveis
  const gerarAlertas = () => {
    const alertas = [];
    
    scores.forEach(fator => {
      if (fator.score <= 2) {
        alertas.push({
          tipo: 'urgente',
          fator: fator.nome,
          mensagem: `${fator.nome} crítico (${fator.score}/${fator.max})`,
          acao: getAcaoSugerida(fator.nome)
        });
      } else if (fator.score === 3) {
        alertas.push({
          tipo: 'atencao',
          fator: fator.nome,
          mensagem: `${fator.nome} precisa de atenção`,
          acao: getAcaoSugerida(fator.nome)
        });
      }
    });
    
    return alertas;
  };

  const getAcaoSugerida = (fator) => {
    const acoes = {
      'Consistência': 'Configure lembretes automáticos para o líder',
      'Evangelismo': 'Planeje evento evangelístico na célula',
      'Engajamento': 'Faça contato individual com membros ausentes',
      'Discipulado': 'Líder deve iniciar novos relacionamentos 1-a-1',
      'Formação': 'Inscreva o líder na trilha de capacitação',
      'Multiplicação': 'Defina data alvo e identifique novo anfitrião',
      'Saúde Kids': 'Recrute e treine líder para célula kids'
    };
    return acoes[fator] || 'Entre em contato com o líder';
  };

  const alertas = gerarAlertas();

  // Dados históricos simulados (últimas 12 semanas)
  const historicoSemanal = [
    { semana: 'S1', score: 25 },
    { semana: 'S2', score: 26 },
    { semana: 'S3', score: 24 },
    { semana: 'S4', score: 27 },
    { semana: 'S5', score: 28 },
    { semana: 'S6', score: 29 },
    { semana: 'S7', score: 30 },
    { semana: 'S8', score: 28 },
    { semana: 'S9', score: 31 },
    { semana: 'S10', score: 32 },
    { semana: 'S11', score: 31 },
    { semana: 'S12', score: scoreTotal }
  ];

  const tendencia = historicoSemanal[historicoSemanal.length - 1].score > historicoSemanal[historicoSemanal.length - 2].score ? 'subindo' : 'descendo';

  // Benchmark (comparação com outras células)
  const mediaDaRede = 28;
  const diferencaMedia = scoreTotal - mediaDaRede;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-800">{cellData.nome}</h1>
              <p className="text-sm text-gray-500">Líder: {cellData.lider} | Supervisor: {cellData.supervisor}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Última atualização</p>
              <p className="text-sm font-medium text-gray-700">Hoje, 10:30</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        
        {/* Score Total e Semáforo */}
        <div className={`bg-gradient-to-br ${
          semaforo.cor === 'green' ? 'from-green-500 to-emerald-600' :
          semaforo.cor === 'yellow' ? 'from-yellow-500 to-orange-600' :
          'from-red-500 to-rose-600'
        } rounded-3xl shadow-xl p-8 text-white`}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-6xl">{semaforo.emoji}</span>
                <div>
                  <h2 className="text-3xl font-bold">Score de Saúde</h2>
                  <p className="text-lg opacity-90">{semaforo.mensagem}</p>
                </div>
              </div>
              <div className="flex items-end gap-4 mt-6">
                <div>
                  <p className="text-sm opacity-80">Pontuação Total</p>
                  <p className="text-6xl font-bold">{scoreTotal}</p>
                  <p className="text-lg opacity-80">de {scoreMaximo} pontos</p>
                </div>
                <div className="mb-2">
                  <p className="text-3xl font-bold">{percentualTotal.toFixed(0)}%</p>
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6">
                <div className="flex items-center gap-2 mb-2">
                  {tendencia === 'subindo' ? (
                    <TrendingUp className="w-6 h-6" />
                  ) : (
                    <TrendingDown className="w-6 h-6" />
                  )}
                  <p className="text-lg font-medium">Tendência</p>
                </div>
                <p className="text-4xl font-bold">
                  {tendencia === 'subindo' ? '↗️' : '↘️'}
                </p>
                <p className="text-sm opacity-90 mt-2">
                  {diferencaMedia > 0 ? `+${diferencaMedia}` : diferencaMedia} pts vs média
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Alertas Acionáveis */}
        {alertas.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border p-6">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-6 h-6 text-orange-600" />
              <h2 className="text-xl font-bold text-gray-800">Ações Recomendadas</h2>
              <span className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-sm font-medium">
                {alertas.length} alerta{alertas.length > 1 ? 's' : ''}
              </span>
            </div>
            <div className="space-y-3">
              {alertas.map((alerta, idx) => (
                <div 
                  key={idx}
                  className={`p-4 rounded-xl border-l-4 ${
                    alerta.tipo === 'urgente' ? 'bg-red-50 border-red-500' : 'bg-yellow-50 border-yellow-500'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className={`font-bold ${alerta.tipo === 'urgente' ? 'text-red-700' : 'text-yellow-700'}`}>
                        {alerta.mensagem}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">💡 {alerta.acao}</p>
                    </div>
                    <button className="px-4 py-2 bg-white border rounded-lg text-sm font-medium hover:bg-gray-50">
                      Agir agora
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Grid de Fatores de Saúde */}
        <div className="grid md:grid-cols-2 gap-4">
          {scores.map((fator, idx) => {
            const Icon = fator.icon;
            const corBg = fator.cor === 'green' ? 'bg-green-50 border-green-200' :
                          fator.cor === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
                          'bg-red-50 border-red-200';
            const corTexto = fator.cor === 'green' ? 'text-green-700' :
                             fator.cor === 'yellow' ? 'text-yellow-700' :
                             'text-red-700';
            const corBarra = fator.cor === 'green' ? 'bg-green-500' :
                             fator.cor === 'yellow' ? 'bg-yellow-500' :
                             'bg-red-500';
            
            return (
              <div key={idx} className={`${corBg} border-2 rounded-2xl p-5 transition-all hover:shadow-md`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 ${fator.cor === 'green' ? 'bg-green-100' : fator.cor === 'yellow' ? 'bg-yellow-100' : 'bg-red-100'} rounded-xl flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${corTexto}`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{fator.nome}</h3>
                      <p className="text-sm text-gray-600">{fator.descricao}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-3xl font-bold ${corTexto}`}>{fator.score}</p>
                    <p className="text-sm text-gray-500">/{fator.max}</p>
                  </div>
                </div>
                
                {/* Barra de progresso */}
                <div className="mb-2">
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div 
                      className={`${corBarra} h-3 rounded-full transition-all duration-500`}
                      style={{ width: `${fator.percentual}%` }}
                    />
                  </div>
                </div>
                
                <p className="text-xs text-gray-600">{fator.detalhes}</p>
              </div>
            );
          })}
        </div>

        {/* Gráfico de Tendência */}
        <div className="bg-white rounded-2xl shadow-sm border p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-6">Evolução do Score (12 semanas)</h2>
          <div className="flex items-end justify-between h-64 gap-2">
            {historicoSemanal.map((data, idx) => {
              const altura = (data.score / scoreMaximo) * 100;
              const cor = altura >= 80 ? 'bg-green-500' : altura >= 60 ? 'bg-yellow-500' : 'bg-red-500';
              
              return (
                <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                  <div className="w-full bg-gray-100 rounded-t-lg relative" style={{ height: `${altura}%`, minHeight: '20px' }}>
                    <div className={`${cor} w-full h-full rounded-t-lg transition-all duration-500 hover:opacity-80`} />
                    {idx === historicoSemanal.length - 1 && (
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-indigo-600 text-white px-2 py-1 rounded text-xs font-bold">
                        {data.score}
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">{data.semana}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Benchmark Comparativo */}
        <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 border-2 border-indigo-200">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Comparação com a Rede</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-1">Sua Célula</p>
              <p className="text-4xl font-bold text-indigo-600">{scoreTotal}</p>
              <p className="text-sm text-gray-500">pontos</p>
            </div>
            <div className="bg-white rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-1">Média da Rede</p>
              <p className="text-4xl font-bold text-gray-700">{mediaDaRede}</p>
              <p className="text-sm text-gray-500">pontos</p>
            </div>
            <div className="bg-white rounded-xl p-4">
              <p className="text-sm text-gray-600 mb-1">Diferença</p>
              <p className={`text-4xl font-bold ${diferencaMedia >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {diferencaMedia >= 0 ? '+' : ''}{diferencaMedia}
              </p>
              <p className="text-sm text-gray-500">pontos</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardSaude;
