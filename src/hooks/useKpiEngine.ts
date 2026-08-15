import { useMemo } from 'react';
import { Timestamp } from 'firebase/firestore';
import { KpiDefinition } from '@/domain/kpi';

interface EngineParams {
  kpiDefinitions: KpiDefinition[];
  cells: any[] | null;
  cultos: any[] | null;
  reports: any[] | null;
  users: any[] | null;
  courses: any[] | null;
  currentYear: number;
}

export function useKpiEngine({
  kpiDefinitions,
  cells,
  cultos,
  reports,
  users,
  courses,
  currentYear,
}: EngineParams) {
  return useMemo(() => {
    const kpiData: Record<string, { actual: number; monthlyActuals: number[] }> = {};

    // Auxiliares de data
    const getMonthlyCount = (items: any[] | null, dateField: string) => {
      const monthly = Array(12).fill(0);
      if (!items) return monthly;
      items.forEach(item => {
        const val = item[dateField];
        let date: Date | null = null;
        if (val instanceof Timestamp) date = val.toDate();
        else if (typeof val === 'string' || typeof val === 'number') {
          try { date = new Date(val); } catch {}
        }
        if (date && date.getFullYear() === currentYear) {
          monthly[date.getMonth()] += 1;
        }
      });
      return monthly;
    };

    const getMonthlySum = (items: any[] | null, dateField: string, valueField: string) => {
      const monthly = Array(12).fill(0);
      if (!items) return monthly;
      items.forEach(item => {
        const val = item[dateField];
        let date: Date | null = null;
        if (val instanceof Timestamp) date = val.toDate();
        else if (typeof val === 'string' || typeof val === 'number') {
          try { date = new Date(val); } catch {}
        }
        if (date && date.getFullYear() === currentYear) {
          monthly[date.getMonth()] += (Number(item[valueField]) || 0);
        }
      });
      return monthly;
    };

    // Processamento de cada KPI definido
    kpiDefinitions.forEach(kpi => {
      const { dataSource } = kpi;
      if (!dataSource) {
        kpiData[kpi.id] = { actual: 0, monthlyActuals: Array(12).fill(0) };
        return;
      }

      switch (dataSource.type) {
        case 'collection_count': {
          if (dataSource.collectionName === 'cells') {
            kpiData[kpi.id] = {
              actual: cells?.length || 0,
              monthlyActuals: getMonthlyCount(cells, 'createdAt'),
            };
          } else {
            kpiData[kpi.id] = { actual: 0, monthlyActuals: Array(12).fill(0) };
          }
          break;
        }

        case 'field_sum': {
          // Conversões: soma tanto conversões quanto reconciliações vindas dos registros de presença nos cultos
          if (dataSource.field === 'conversoes' || kpi.id === 'conversoes') {
            const monthlyActuals = Array(12).fill(0);
            let total = 0;

            // 1. Pega dados da Frequência de Culto (registros_de_presenca)
            cultos?.forEach(c => {
              const conv = Number(c.conversoes) || 0;
              const reconc = Number(c.reconciliacoes) || 0;
              const sum = conv + reconc;
              total += sum;

              let date: Date | null = null;
              if (c.data instanceof Timestamp) date = c.data.toDate();
              else if (typeof c.data === 'string' || typeof c.data === 'number') {
                try { date = new Date(c.data); } catch {}
              } else if (c.date) {
                try { date = new Date(c.date); } catch {}
              }

              if (date && date.getFullYear() === currentYear && sum > 0) {
                monthlyActuals[date.getMonth()] += sum;
              }
            });

            // 2. Se houver relatórios adicionais em attendance_reports, agrega se aplicável
            if (reports && (!cultos || cultos.length === 0)) {
              reports.forEach(r => {
                const conv = Number(r.conversoes) || 0;
                const reconc = Number(r.reconciliacoes) || 0;
                const sum = conv + reconc;
                total += sum;

                let date: Date | null = null;
                if (r.date instanceof Timestamp) date = r.date.toDate();
                else if (typeof r.date === 'string' || typeof r.date === 'number') {
                  try { date = new Date(r.date); } catch {}
                }

                if (date && date.getFullYear() === currentYear && sum > 0) {
                  monthlyActuals[date.getMonth()] += sum;
                }
              });
            }

            kpiData[kpi.id] = {
              actual: total,
              monthlyActuals,
            };
          } else {
            kpiData[kpi.id] = { actual: 0, monthlyActuals: Array(12).fill(0) };
          }
          break;
        }

        case 'attendance_avg': {
          const targetHorario = dataSource.horario;
          const monthlyAttendance = Array(12).fill(0);
          const monthlyCounts = Array(12).fill(0);

          cultos?.forEach(culto => {
            let date: Date | null = null;
            if (culto.data instanceof Timestamp) date = culto.data.toDate();
            else if (typeof culto.data === 'string' || typeof culto.data === 'number') {
              try { date = new Date(culto.data); } catch {}
            }

            if (date && date.getFullYear() === currentYear) {
              const month = date.getMonth();
              const isMatch = targetHorario
                ? culto.horario === targetHorario
                : true;

              if (isMatch) {
                monthlyAttendance[month] += (culto.adultos || 0) + (culto.criancas || 0);
                monthlyCounts[month] += 1;
              }
            }
          });

          const monthlyAvg = monthlyAttendance.map((total, i) =>
            monthlyCounts[i] > 0 ? Math.round(total / monthlyCounts[i]) : 0
          );

          const validMonths = monthlyAvg.filter(v => v > 0);
          const overallAvg = validMonths.length > 0
            ? Math.round(validMonths.reduce((a, b) => a + b, 0) / validMonths.length)
            : 0;

          kpiData[kpi.id] = {
            actual: overallAvg,
            monthlyActuals: monthlyAvg,
          };
          break;
        }

        case 'user_field': {
          // Batismo: Conta estritamente as pessoas aprovadas no curso de Batismo
          if (dataSource.field === 'batizado' || kpi.id === 'batismos') {
            const batismoCourses = courses?.filter(c => {
              const name = (c.name || c.title || c.id || '').toLowerCase();
              return name.includes('batismo') || c.linkedTheoflixId === 'batismo';
            }) || [];
            const batismoIds = new Set(['batismo', ...batismoCourses.map(c => c.id), ...batismoCourses.map(c => c.id?.toLowerCase())]);

            const approvedBaptismUsers = users?.filter(u => {
              const cStatus = u.journey?.courseStatus || {};
              const isApproved = Array.from(batismoIds).some(bId => {
                const st = (cStatus[bId] || '').toLowerCase();
                return st === 'approved' || st === 'completed' || st === 'apto' || st === 'concluido' || st === 'concluído';
              });
              return isApproved;
            }) || [];

            const monthlyActuals = Array(12).fill(0);
            approvedBaptismUsers.forEach(u => {
              let date: Date | null = null;
              // Procura a data de aprovação registrada no curso
              for (const bId of Array.from(batismoIds)) {
                if (u.journey?.courseApprovedAt?.[bId]) {
                  const val = u.journey.courseApprovedAt[bId];
                  if (val instanceof Timestamp) date = val.toDate();
                  else { try { date = new Date(val); } catch {} }
                  if (date) break;
                }
              }
              if (!date && u.updatedAt instanceof Timestamp) {
                date = u.updatedAt.toDate();
              } else if (!date && u.createdAt instanceof Timestamp) {
                date = u.createdAt.toDate();
              }

              if (date && date.getFullYear() === currentYear) {
                monthlyActuals[date.getMonth()] += 1;
              }
            });

            kpiData[kpi.id] = {
              actual: approvedBaptismUsers.length,
              monthlyActuals,
            };
          } else {
            kpiData[kpi.id] = { actual: 0, monthlyActuals: Array(12).fill(0) };
          }
          break;
        }

        case 'course_completion': {
          let cid = dataSource.courseId;
          const searchStr = (dataSource.courseName || cid || '').toLowerCase();

          // Coleta todos os IDs e aliases do curso correspondente
          const matchingCourses = courses?.filter(c => {
            const name = (c.name || c.title || '').toLowerCase();
            const id = (c.id || '').toLowerCase();
            const linked = (c.linkedTheoflixId || '').toLowerCase();
            return (
              (cid && id === cid.toLowerCase()) ||
              (searchStr && (name.includes(searchStr) || id.includes(searchStr) || linked.includes(searchStr)))
            );
          }) || [];

          const targetIds = new Set<string>();
          if (cid) targetIds.add(cid);
          if (searchStr) targetIds.add(searchStr);
          matchingCourses.forEach(c => {
            if (c.id) targetIds.add(c.id);
            if (c.linkedTheoflixId) targetIds.add(c.linkedTheoflixId);
          });

          const completedUsers = users?.filter(u => {
            const cStatus = u.journey?.courseStatus || {};
            return Array.from(targetIds).some(targetId => {
              const status = (cStatus[targetId] || '').toLowerCase();
              return status === 'approved' || status === 'completed' || status === 'apto' || status === 'concluido' || status === 'concluído';
            });
          }) || [];

          const monthlyActuals = Array(12).fill(0);
          completedUsers.forEach(u => {
            let date: Date | null = null;
            for (const targetId of Array.from(targetIds)) {
              if (u.journey?.courseApprovedAt?.[targetId]) {
                const val = u.journey.courseApprovedAt[targetId];
                if (val instanceof Timestamp) date = val.toDate();
                else { try { date = new Date(val); } catch {} }
                if (date) break;
              }
            }
            if (!date && u.updatedAt instanceof Timestamp) {
              date = u.updatedAt.toDate();
            } else if (!date && u.createdAt instanceof Timestamp) {
              date = u.createdAt.toDate();
            }

            if (date && date.getFullYear() === currentYear) {
              monthlyActuals[date.getMonth()] += 1;
            }
          });

          kpiData[kpi.id] = {
            actual: completedUsers.length,
            monthlyActuals,
          };
          break;
        }

        case 'user_role': {
          const targetRoles = dataSource.roles || [];
          const leaders = users?.filter(u => {
            const status = u.integrationStatus;
            const role = u.hierarchy?.role;
            return (
              (status && targetRoles.includes(status)) ||
              (role && targetRoles.includes(role))
            );
          }) || [];

          kpiData[kpi.id] = {
            actual: leaders.length,
            monthlyActuals: getMonthlyCount(leaders, 'promotionDate'),
          };
          break;
        }

        case 'manual':
        default: {
          kpiData[kpi.id] = { actual: 0, monthlyActuals: Array(12).fill(0) };
          break;
        }
      }
    });

    return kpiData;
  }, [kpiDefinitions, cells, cultos, reports, users, courses, currentYear]);
}
