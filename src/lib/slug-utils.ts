/**
 * Utilitários para criação, normalização e resolução de Slugs amigáveis
 * para Eventos e Cursos da Igreja.
 */

export function slugify(text: string): string {
  if (!text) return '';
  return text
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // remove caracteres especiais
    .replace(/\s+/g, '-') // substitui espaços por traço
    .replace(/-+/g, '-'); // colapsa múltiplos traços
}

export function matchSlug(
  item: { id?: string; slug?: string; eventName?: string; name?: string; title?: string },
  targetSlugOrId: string
): boolean {
  if (!item || !targetSlugOrId) return false;

  const target = slugify(targetSlugOrId);
  const targetRaw = targetSlugOrId.toLowerCase().trim();

  // 1. Comparação direta com ID
  if (item.id && (item.id === targetSlugOrId || item.id.toLowerCase() === targetRaw)) {
    return true;
  }

  // 2. Comparação com o campo 'slug' salvo
  if (item.slug) {
    const itemSlug = slugify(item.slug);
    if (itemSlug === target || item.slug.toLowerCase() === targetRaw) {
      return true;
    }
  }

  // 3. Comparação com o slug gerado a partir do nome do evento/curso
  const itemName = item.eventName || item.name || item.title || '';
  if (itemName) {
    const generatedSlug = slugify(itemName);
    if (generatedSlug === target) {
      return true;
    }
  }

  return false;
}

export function getEventRegistrationPath(event: { id: string; slug?: string; eventName?: string }): string {
  const slug = event.slug ? slugify(event.slug) : slugify(event.eventName || '') || event.id;
  return `/inscricao/${slug}`;
}

export function getCourseRegistrationPath(course: { id: string; slug?: string; name?: string }): string {
  const slug = course.slug ? slugify(course.slug) : slugify(course.name || '') || course.id;
  return `/inscricao/${slug}`;
}
