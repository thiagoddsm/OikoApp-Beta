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
          if (dataSource.collectionName === 'attendance_reports' && dataSource.field === 'conversoes') {
            const total = reports?.reduce((sum, r) => sum + (Number(r.conversoes) || 0), 0) || 0;
            kpiData[kpi.id] = {
              actual: total,
              monthlyActuals: getMonthlySum(reports, 'date', 'conversoes'),
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
            const date = culto.data instanceof Timestamp ? culto.data.toDate() : null;
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
          if (dataSource.field === 'batizado') {
            const batismoCourse = courses?.find(c =>
              (c.name || c.title || '').toLowerCase().includes('batismo')
            );
            const batismoCourseId = batismoCourse?.id;

            const baptizedUsers = users?.filter(u => {
              const hasDirect = u.batizado === 'sim' || u.dataBatismo || u.churchData?.baptismDate;
              const hasCourse = batismoCourseId && u.journey?.courseStatus?.[batismoCourseId] === 'approved';
              return hasDirect || hasCourse;
            }) || [];

            const monthlyActuals = Array(12).fill(0);
            baptizedUsers.forEach(u => {
              let date: Date | null = null;
              if (u.dataBatismo) {
                try { date = new Date(u.dataBatismo); } catch {}
              } else if (u.churchData?.baptismDate instanceof Timestamp) {
                date = u.churchData.baptismDate.toDate();
              } else if (batismoCourseId && u.journey?.courseApprovedAt?.[batismoCourseId]) {
                const val = u.journey.courseApprovedAt[batismoCourseId];
                if (val instanceof Timestamp) date = val.toDate();
                else { try { date = new Date(val); } catch {} }
              } else if (u.createdAt instanceof Timestamp) {
                date = u.createdAt.toDate();
              }

              if (date && date.getFullYear() === currentYear) {
                monthlyActuals[date.getMonth()] += 1;
              }
            });

            kpiData[kpi.id] = {
              actual: baptizedUsers.length,
              monthlyActuals,
            };
          } else {
            kpiData[kpi.id] = { actual: 0, monthlyActuals: Array(12).fill(0) };
          }
          break;
        }

        case 'course_completion': {
          let cid = dataSource.courseId;

          // Se não houver ID explícito, tenta busca por nome
          if (!cid && dataSource.courseName) {
            const searchStr = dataSource.courseName.toLowerCase();
            const courseObj = courses?.find(c => {
              const name = (c.name || c.title || '').toLowerCase();
              return name.includes(searchStr);
            });
            cid = courseObj?.id;
          }

          const completedUsers = users?.filter(u => {
            if (!cid) return false;
            const status = (u.journey?.courseStatus?.[cid] || '').toLowerCase();
            return status === 'approved' || status === 'completed' || status === 'apto';
          }) || [];

          const monthlyActuals = Array(12).fill(0);
          completedUsers.forEach(u => {
            let date: Date | null = null;
            if (cid && u.journey?.courseApprovedAt?.[cid]) {
              const val = u.journey.courseApprovedAt[cid];
              if (val instanceof Timestamp) date = val.toDate();
              else { try { date = new Date(val); } catch {} }
            } else if (u.createdAt instanceof Timestamp) {
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
