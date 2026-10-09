export function formatScheduleItemsWithCheckIn(
  scheduledItems: any[],
  areaData: any,
  eventsData: any[]
): string[] {
  const checkInTimes = areaData?.checkInTimes || {};
  const unifiedGroups = areaData?.unifiedGroups || [];

  const seenGroups = new Set<string>();
  const weekDays = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

  return scheduledItems.map(item => {
    // Determine fallback date & day
    let day = '';
    if (item.date && item.date.includes('/')) {
      const [d, m, y] = item.date.split('/');
      const dateObj = new Date(parseInt(y), parseInt(m) - 1, parseInt(d), 12, 0, 0);
      day = weekDays[dateObj.getDay()];
    }

    let checkInTime = null;

    if (unifiedGroups && unifiedGroups.length > 0) {
      const group = unifiedGroups.find((g: any) => g.eventNames.some((name: string) => item.eventName.toLowerCase().includes(name.toLowerCase())));
      if (group && group.checkInTime) {
        checkInTime = group.checkInTime;
      }
    }

    if (!checkInTime) {
      checkInTime = checkInTimes[item.eventName] || null;
    }

    if (!checkInTime) {
      const evt = eventsData.find((e: any) => e.name === item.eventName);
      if (evt && evt.time) {
        const [h, m] = evt.time.split(':').map(Number);
        const dateObj = new Date();
        dateObj.setHours(h, m, 0);
        dateObj.setHours(dateObj.getHours() - 1);
        checkInTime = `${String(dateObj.getHours()).padStart(2, '0')}:${String(dateObj.getMinutes()).padStart(2, '0')}`;
      }
    }

    let timeStr = checkInTime ? ` (Chegada: ${checkInTime})` : '';

    if (unifiedGroups && unifiedGroups.length > 0) {
      const group = unifiedGroups.find((g: any) => g.eventNames.some((name: string) => item.eventName.toLowerCase().includes(name.toLowerCase())));
      if (group) {
        const groupKey = `${item.date}-${group.name}`;
        if (seenGroups.has(groupKey)) {
          timeStr = ''; // Suppress check-in time for subsequent events in the same group on the same day
        } else {
          seenGroups.add(groupKey);
        }
      }
    }

    const dateDisplay = day ? `${item.date} (${day})` : item.date;
    return `${dateDisplay} - ${item.eventName}${timeStr}${item.teamName ? ` [Equipe ${item.teamName}]` : ''}`;
  });
}
