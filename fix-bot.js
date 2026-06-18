const fs = require('fs');
let code = fs.readFileSync('src/lib/gc-report-bot.ts', 'utf8');

// Replace START
code = code.replace(
  /await sendText\(\s*liderPhone,\s*`Olá, líder\${liderName}! 👋\\nVamos preencher o relatório semanal do GC \*\${cellData\.nome \|\| 'Célula'}\*\? É rapidinho!\\n\\n📋 \*Etapa 1: Chamada\*\\nMarque na enquete abaixo quem esteve \*PRESENTE\* na reunião\.`\s*\);\s*await sendMembersPolls\(liderPhone, membersList, false\);/,
  `const listaChamada = membersList.map((m, i) => \`\${i + 1}. \${m.name}\`).join('\\n');
    await sendText(
      liderPhone,
      \`Olá, líder\${liderName}! 👋\\nVamos preencher o relatório semanal do GC *\${cellData.nome || 'Célula'}*? É rapidinho!\\n\\n📋 *Etapa 1: Chamada*\\nQuem esteve *PRESENTE* na reunião?\\n\\n\${listaChamada}\\n\\n👉 *Responda com os NÚMEROS dos presentes separados por vírgula (Ex: 1, 3, 5).* Se ninguém estava presente, digite *0*.\`
    );`
);

// Replace ATTENDANCE
const oldAttendance = `      case 'ATTENDANCE':
        // Guardar as respostas de enquete acumuladas
        if (type === 'poll' && payload?.selectedOptions) {
          const selectedNames = payload.selectedOptions as string[];
          const accumulated = [...(session.attendanceAccumulated || [])];
          
          // Buscar membros de TODAS as páginas
          session.members.forEach(member => {
            const isSelected = selectedNames.includes(member.name);
            const existsInAccumulated = accumulated.includes(member.id);
            if (isSelected && !existsInAccumulated) {
              accumulated.push(member.id);
            }
          });
          
          await sessionRef.update({ attendanceAccumulated: accumulated, updatedAt: now });
          console.log(\`[GC Bot] Presença atualizada: \${accumulated.length} presentes de \${session.members.length}\`);
        }

        // Concluir chamada quando votar na enquete de avanço, ou digitar ok/pronto, ou clicar botão
        const isAdvancePoll = type === 'poll' && payload?.selectedOptions?.some((o: string) => 
          o.toLowerCase().includes('avançar') || o.toLowerCase().includes('avancar') || o.toLowerCase().includes('concluir')
        );
        const isAdvanceText = type === 'text' && isAdvanceCommand(msg);
        const isAdvanceButton = type === 'button';
        
        if (isAdvancePoll || isAdvanceText || isAdvanceButton) {
          const latestSessionDoc = await sessionRef.get();
          const latestSession = latestSessionDoc.data() as GcReportSession;
          const accumulated = latestSession.attendanceAccumulated || [];
          
          const attendanceMap: { [memberId: string]: 'presente' | 'ausente_sem_justificativa' } = {};
          session.members.forEach(member => {
            attendanceMap[member.id] = accumulated.includes(member.id) ? 'presente' : 'ausente_sem_justificativa';
          });

          const presentCount = Object.values(attendanceMap).filter(v => v === 'presente').length;
          const absentCount = Object.values(attendanceMap).filter(v => v === 'ausente_sem_justificativa').length;
          
          await sessionRef.update({
            attendance: attendanceMap,
            step: 'CARE_CHOICE',
            updatedAt: now
          });
          
          await sendText(
            fromPhone,
            \`✅ Chamada registrada! \${presentCount} presentes, \${absentCount} ausentes.\\n\\n❤️ *Etapa de Cuidado*\\n\\nAlgum membro do GC precisa de atenção ou cuidado especial esta semana?\`
          );
          await wait(1000);
          await sendSurvey(fromPhone, 'Algum membro precisa de cuidado?', ['Sim', 'Não']);
        }
        break;`;

const newAttendance = `      case 'ATTENDANCE':
        if (type !== 'text') {
           await sendText(fromPhone, 'Por favor, envie os *números* dos presentes, separados por vírgula (ex: 1, 3, 5). Se ninguém faltou, digite *todos*. Se ninguém esteve presente, digite *0*.');
           return true;
        }

        let presentIds: string[] = [];
        if (msg === 'todos' || msg === 'todo mundo') {
           presentIds = session.members.map(m => m.id);
        } else if (msg !== '0' && msg !== 'nenhum') {
           const nums = msg.split(/[,; e]+/).map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n) && n > 0 && n <= session.members.length);
           presentIds = nums.map(n => session.members[n - 1].id);
           
           if (presentIds.length === 0) {
             await sendText(fromPhone, 'Não entendi os números. Envie no formato: *1, 3, 5* ou digite *0* se ninguém esteve presente.');
             return true;
           }
        }
        
        const attendanceMap: { [memberId: string]: 'presente' | 'ausente_sem_justificativa' } = {};
        session.members.forEach(member => {
          attendanceMap[member.id] = presentIds.includes(member.id) ? 'presente' : 'ausente_sem_justificativa';
        });

        const presentCount = presentIds.length;
        const absentCount = session.members.length - presentCount;
        
        await sessionRef.update({
          attendance: attendanceMap,
          step: 'CARE_CHOICE',
          updatedAt: now
        });
        
        await sendText(
          fromPhone,
          \`✅ Chamada registrada! \${presentCount} presentes, \${absentCount} ausentes.\\n\\n❤️ *Etapa de Cuidado*\\n\\nAlgum membro do GC precisa de atenção ou cuidado especial esta semana?\\n\\n👉 *Responda SIM ou NÃO*\`
        );
        break;`;

code = code.replace(oldAttendance, newAttendance);

// Replace CARE_CHOICE
const oldCareChoice = `      case 'CARE_CHOICE': {
        // Detectar resposta via enquete (Sim/Não) ou texto
        let careAnswer: 'sim' | 'nao' | null = null;
        
        if (type === 'poll' && payload?.selectedOptions) {
          const options = (payload.selectedOptions as string[]).map((o: string) => o.toLowerCase());
          if (options.some((o: string) => o.includes('sim'))) careAnswer = 'sim';
          else if (options.some((o: string) => o.includes('não') || o.includes('nao'))) careAnswer = 'nao';
        } else if (type === 'text') {
          if (msg === 'sim' || msg === 's') careAnswer = 'sim';
          else if (msg === 'não' || msg === 'nao' || msg === 'n') careAnswer = 'nao';
        } else if (type === 'button') {
          if (payload?.buttonId === 'care_yes') careAnswer = 'sim';
          if (payload?.buttonId === 'care_no') careAnswer = 'nao';
        }
        
        if (careAnswer === 'sim') {
          const presentMembers = session.members.filter(m => session.attendance[m.id] === 'presente');
          
          if (presentMembers.length === 0) {
            await sendText(fromPhone, 'Nenhum membro foi marcado como presente. Avançando para a lição...');
            await sessionRef.update({ step: 'METRICS_LESSON', updatedAt: now });
            await sendText(fromPhone, '📖 *Etapa 2: Tema da Lição*\\n\\nQual foi o tema ou título da lição ministrada no GC esta semana?');
          } else {
            await sessionRef.update({ step: 'CARE_SELECT', updatedAt: now });
            const presentNames = presentMembers.map(m => m.name);
            
            await sendSurvey(
              fromPhone,
              'Quem precisa de atenção especial?',
              presentNames.slice(0, 11)
            );
            
            await wait(1000);
            await sendSurvey(fromPhone, '✅ Concluir seleção de cuidado', ['Avançar ➡️', 'Ainda não ❌']);
          }
        } else if (careAnswer === 'nao') {
          await sessionRef.update({ step: 'METRICS_LESSON', updatedAt: now });
          await sendText(fromPhone, '📖 *Etapa 2: Tema da Lição*\\n\\nQual foi o tema ou título da lição ministrada no GC esta semana?\\n\\n_Envie o título por mensagem de texto._');
        } else if (type === 'text') {
          await sendText(fromPhone, 'Vote na enquete acima: *Sim* se algum membro precisa de cuidado, ou *Não* para avançar.');
        }
        break;
      }`;

const newCareChoice = `      case 'CARE_CHOICE': {
        let careAnswer: 'sim' | 'nao' | null = null;
        
        if (type === 'text') {
          if (msg === 'sim' || msg === 's' || msg.includes('sim')) careAnswer = 'sim';
          else if (msg === 'não' || msg === 'nao' || msg === 'n' || msg.includes('nao') || msg.includes('não')) careAnswer = 'nao';
        }
        
        if (careAnswer === 'sim') {
          const presentMembers = session.members.filter(m => session.attendance[m.id] === 'presente');
          
          if (presentMembers.length === 0) {
            await sendText(fromPhone, 'Nenhum membro foi marcado como presente. Avançando para a lição...');
            await sessionRef.update({ step: 'METRICS_LESSON', updatedAt: now });
            await sendText(fromPhone, '📖 *Etapa 2: Tema da Lição*\\n\\nQual foi o tema ou título da lição ministrada no GC esta semana?');
          } else {
            await sessionRef.update({ step: 'CARE_SELECT', updatedAt: now });
            const listaCuidado = presentMembers.map((m, i) => \`\${i + 1}. \${m.name}\`).join('\\n');
            
            await sendText(
              fromPhone,
              \`Quem precisa de atenção especial?\\n\\n\${listaCuidado}\\n\\n👉 *Responda com os NÚMEROS separados por vírgula*.\`
            );
          }
        } else if (careAnswer === 'nao') {
          await sessionRef.update({ step: 'METRICS_LESSON', updatedAt: now });
          await sendText(fromPhone, '📖 *Etapa 2: Tema da Lição*\\n\\nQual foi o tema ou título da lição ministrada no GC esta semana?\\n\\n_Envie o título por mensagem de texto._');
        } else {
          await sendText(fromPhone, 'Responda com *Sim* se algum membro precisa de cuidado, ou *Não* para avançar.');
        }
        break;
      }`;

code = code.replace(oldCareChoice, newCareChoice);

// Replace CARE_SELECT
const oldCareSelect = `      case 'CARE_SELECT':
        if (type === 'poll' && payload?.selectedOptions) {
          const selectedNames = payload.selectedOptions as string[];
          
          // Verificar se é a enquete de avanço
          const isAdvancePollVote = selectedNames.some((o: string) => 
            o.toLowerCase().includes('avançar') || o.toLowerCase().includes('avancar') || o.toLowerCase().includes('concluir')
          );
          
          if (!isAdvancePollVote) {
            // É a enquete de seleção de membros
            const careQueue: string[] = [];
            session.members.forEach(member => {
              if (selectedNames.includes(member.name)) {
                careQueue.push(member.id);
              }
            });
            await sessionRef.update({ careMembersQueue: careQueue, updatedAt: now });
          }
          
          if (isAdvancePollVote) {
            // Avançar
            const latestDoc = await sessionRef.get();
            const latest = latestDoc.data() as GcReportSession;
            const careQueue = latest.careMembersQueue || [];
            
            if (careQueue.length === 0) {
              await sendText(fromPhone, 'Nenhum membro foi selecionado. Avançando para a lição...');
              await sessionRef.update({ step: 'METRICS_LESSON', updatedAt: now });
              await sendText(fromPhone, '📖 *Etapa 2: Tema da Lição*\\n\\nQual foi o tema ou título da lição ministrada no GC esta semana?\\n\\n_Envie o título por mensagem de texto._');
            } else {
              await sessionRef.update({
                step: 'CARE_MEMBER_THERMOMETER',
                currentCareIndex: 0,
                updatedAt: now
              });
              
              const firstMemberId = careQueue[0];
              const firstMember = session.members.find(m => m.id === firstMemberId);
              await sendSurvey(
                fromPhone,
                \`🌡️ Termômetro de \${firstMember?.name || 'Membro'} (1/\${careQueue.length})\`,
                ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
              );
            }
          }
        }
        
        if (type === 'text' && isAdvanceCommand(msg)) {
          const latestDoc = await sessionRef.get();
          const latest = latestDoc.data() as GcReportSession;
          const careQueue = latest.careMembersQueue || [];
          
          if (careQueue.length === 0) {
            await sendText(fromPhone, 'Nenhum membro foi selecionado. Avançando para a lição...');
            await sessionRef.update({ step: 'METRICS_LESSON', updatedAt: now });
            await sendText(fromPhone, '📖 *Etapa 2: Tema da Lição*\\n\\nQual foi o tema ou título da lição ministrada no GC esta semana?\\n\\n_Envie o título por mensagem de texto._');
          } else {
            await sessionRef.update({
              step: 'CARE_MEMBER_THERMOMETER',
              currentCareIndex: 0,
              updatedAt: now
            });
            
            const firstMemberId = careQueue[0];
            const firstMember = session.members.find(m => m.id === firstMemberId);
            await sendSurvey(
              fromPhone,
              \`🌡️ Termômetro de \${firstMember?.name || 'Membro'} (1/\${careQueue.length})\`,
              ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
            );
          }
        }
        break;`;

const newCareSelect = `      case 'CARE_SELECT':
        if (type !== 'text') {
           await sendText(fromPhone, 'Por favor, envie os *números* dos membros que precisam de cuidado (ex: 1, 3).');
           return true;
        }

        const presentMembersCare = session.members.filter(m => session.attendance[m.id] === 'presente');
        
        let careIds: string[] = [];
        if (msg === 'todos' || msg === 'todo mundo') {
           careIds = presentMembersCare.map(m => m.id);
        } else if (msg !== '0' && msg !== 'nenhum') {
           const nums = msg.split(/[,; e]+/).map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n) && n > 0 && n <= presentMembersCare.length);
           careIds = nums.map(n => presentMembersCare[n - 1].id);
           
           if (careIds.length === 0) {
             await sendText(fromPhone, 'Não entendi os números. Envie no formato: *1, 3, 5* ou digite *0* para pular.');
             return true;
           }
        }

        await sessionRef.update({ careMembersQueue: careIds, updatedAt: now });

        if (careIds.length === 0) {
          await sessionRef.update({ step: 'METRICS_LESSON', updatedAt: now });
          await sendText(fromPhone, 'Ninguém selecionado para cuidado.\\n\\n📖 *Etapa 2: Tema da Lição*\\n\\nQual foi o tema ou título da lição ministrada no GC esta semana?');
        } else {
          await sessionRef.update({
            step: 'CARE_MEMBER_THERMOMETER',
            currentCareIndex: 0,
            updatedAt: now
          });
          
          const firstMemberId = careIds[0];
          const firstMember = session.members.find(m => m.id === firstMemberId);
          await sendText(
            fromPhone,
            \`🌡️ *Termômetro: \${firstMember?.name} (1/\${careIds.length})*\\n\\nComo você avalia o momento atual dele(a)?\\n👉 *Responda com uma nota de 1 a 10* (1 = muita ajuda, 10 = excelente).\`
          );
        }
        break;`;

code = code.replace(oldCareSelect, newCareSelect);

// Replace CARE_MEMBER_THERMOMETER
const oldCareThermometer = `      case 'CARE_MEMBER_THERMOMETER':
        let nota: string | null = null;
        if (type === 'poll' && payload?.selectedOptions && payload.selectedOptions.length > 0) {
          nota = payload.selectedOptions[0];
        } else if (type === 'text') {
          const num = parseInt(msg.trim(), 10);
          if (!isNaN(num) && num >= 1 && num <= 10) {
            nota = num.toString();
          }
        }
        
        if (nota) {
          const latestSessionDoc = await sessionRef.get();
          const latestSession = latestSessionDoc.data() as GcReportSession;
          const careQueue = latestSession.careMembersQueue || [];
          const currentIndex = latestSession.currentCareIndex || 0;
          
          const currentMemberId = careQueue[currentIndex];
          const thermometers = { ...latestSession.thermometers, [currentMemberId]: nota };
          
          await sessionRef.update({
            thermometers,
            currentCareIndex: currentIndex + 1,
            updatedAt: now
          });
          
          const nextIndex = currentIndex + 1;
          if (nextIndex < careQueue.length) {
            const nextMemberId = careQueue[nextIndex];
            const nextMember = session.members.find(m => m.id === nextMemberId);
            await sendSurvey(
              fromPhone,
              \`🌡️ Termômetro de \${nextMember?.name || 'Membro'} (\${nextIndex + 1}/\${careQueue.length})\`,
              ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10']
            );
          } else {
            await sessionRef.update({ step: 'METRICS_LESSON', updatedAt: now });
            await sendText(fromPhone, 'Cuidado registrado! ✅\\n\\n📖 *Etapa 2: Tema da Lição*\\n\\nQual foi o tema ou título da lição ministrada no GC esta semana?\\n\\n_Envie o título por mensagem de texto._');
          }
        } else {
          await sendText(fromPhone, 'Por favor, vote na enquete escolhendo uma nota de 1 a 10.');
        }
        break;`;

const newCareThermometer = `      case 'CARE_MEMBER_THERMOMETER':
        let nota: string | null = null;
        if (type === 'text') {
          const num = parseInt(msg.trim(), 10);
          if (!isNaN(num) && num >= 1 && num <= 10) {
            nota = num.toString();
          }
        }
        
        if (nota) {
          const latestSessionDoc = await sessionRef.get();
          const latestSession = latestSessionDoc.data() as GcReportSession;
          const careQueue = latestSession.careMembersQueue || [];
          const currentIndex = latestSession.currentCareIndex || 0;
          
          const currentMemberId = careQueue[currentIndex];
          const thermometers = { ...latestSession.thermometers, [currentMemberId]: nota };
          
          await sessionRef.update({
            thermometers,
            currentCareIndex: currentIndex + 1,
            updatedAt: now
          });
          
          const nextIndex = currentIndex + 1;
          if (nextIndex < careQueue.length) {
            const nextMemberId = careQueue[nextIndex];
            const nextMember = session.members.find(m => m.id === nextMemberId);
            await sendText(
              fromPhone,
              \`🌡️ *Termômetro: \${nextMember?.name} (\${nextIndex + 1}/\${careQueue.length})*\\n\\nComo você avalia o momento atual dele(a)?\\n👉 *Responda com uma nota de 1 a 10* (1 = muita ajuda, 10 = excelente).\`
            );
          } else {
            await sessionRef.update({ step: 'METRICS_LESSON', updatedAt: now });
            await sendText(fromPhone, 'Cuidado registrado! ✅\\n\\n📖 *Etapa 2: Tema da Lição*\\n\\nQual foi o tema ou título da lição ministrada no GC esta semana?\\n\\n_Envie o título por mensagem de texto._');
          }
        } else {
          await sendText(fromPhone, 'Por favor, digite um número de 1 a 10.');
        }
        break;`;

code = code.replace(oldCareThermometer, newCareThermometer);

fs.writeFileSync('src/lib/gc-report-bot.ts', code, 'utf8');
console.log('Script completed');
