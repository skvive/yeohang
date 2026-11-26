/** Normalize only the coordinates and guidance needed for an in-app road preview. */
const MAX_POINTS = 8000;
const pointInKorea = (lng: number, lat: number) =>
  Number.isFinite(lng) && Number.isFinite(lat) && lng >= 124 && lng <= 132 && lat >= 32 && lat <= 40;

export function routeDetails(route: Record<string, unknown>) {
  const sections = Array.isArray(route.sections) ? route.sections : [];
  const geometry: Array<[number, number]> = [];
  const guides: Array<{ lat: number; lng: number; guidance: string; type: number }> = [];
  for (const rawSection of sections) {
    if (!rawSection || typeof rawSection !== 'object') continue;
    const section = rawSection as Record<string, unknown>;
    for (const rawRoad of Array.isArray(section.roads) ? section.roads : []) {
      if (!rawRoad || typeof rawRoad !== 'object') continue;
      const vertices = (rawRoad as Record<string, unknown>).vertexes;
      if (!Array.isArray(vertices)) continue;
      for (let i = 0; i + 1 < vertices.length && geometry.length < MAX_POINTS; i += 2) {
        const lng = Number(vertices[i]), lat = Number(vertices[i + 1]);
        if (pointInKorea(lng, lat) &&
          (geometry.length === 0 || geometry.at(-1)?.[0] !== lat || geometry.at(-1)?.[1] !== lng)) {
          geometry.push([lat, lng]);
        }
      }
    }
    for (const rawGuide of Array.isArray(section.guides) ? section.guides : []) {
      if (!rawGuide || typeof rawGuide !== 'object' || guides.length >= 200) continue;
      const guide = rawGuide as Record<string, unknown>;
      const lng = Number(guide.x), lat = Number(guide.y);
      if (!pointInKorea(lng, lat)) continue;
      guides.push({ lat, lng, guidance: String(guide.guidance || '').slice(0, 140), type: Number(guide.type) || 0 });
    }
  }
  return { geometry, guides };
}
