function getDeterministicColor(str, name) {
  if (name) {
    const normalized = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (normalized.includes('vermelh')) return '#EF4444'; // Red
    if (normalized.includes('verd')) return '#10B981'; // Green
    if (normalized.includes('laranj')) return '#F97316'; // Orange
    if (normalized.includes('amarel')) return '#F59E0B'; // Yellow
    if (normalized.includes('azul')) return '#3B82F6'; // Blue
    if (normalized.includes('rosa')) return '#EC4899'; // Pink
    if (normalized.includes('rox') || normalized.includes('violet') || normalized.includes('indig')) return '#8B5CF6'; // Purple/Violet/Indigo
    if (normalized.includes('cian') || normalized.includes('turquesa')) return '#06B6D4'; // Cyan
    if (normalized.includes('marrom') || normalized.includes('castanh')) return '#78350F'; // Brown
    if (normalized.includes('cinz') || normalized.includes('grafit')) return '#6B7280'; // Gray
    if (normalized.includes('pret')) return '#0F172A'; // Black/Slate
  }

  const presets = [
    '#6366F1', // Indigo
    '#8B5CF6', // Violet
    '#3B82F6', // Blue
    '#06B6D4', // Cyan
    '#14B8A6', // Teal
    '#10B981', // Emerald
    '#F59E0B', // Amber
    '#F97316', // Orange
    '#EF4444', // Red
    '#EC4899', // Pink
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % presets.length;
  return presets[index];
}

console.log("Vermelha:", getDeterministicColor("2Gkq8iQi3Ssahzwh3fCz", "Vermelha"));
console.log("Verde:", getDeterministicColor("DHDnqaw6RYMqp9rB3HNC", "Verde"));
console.log("Laranja:", getDeterministicColor("FgIvN2hYW09ydFhzMrqM", "Laranja"));
console.log("Amarela:", getDeterministicColor("gwkWRNpLW1WkFxLecWAm", "Amarela"));
