import { listPlaces } from '@/lib/places';
import { PlaceChrome, PlacesIndexBody } from '@/lib/place';

export const dynamic = 'force-dynamic';

export default async function PlacesPage({
  searchParams,
}: {
  searchParams: Promise<{ city?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const city = String(sp.city || '').trim();
  const q = String(sp.q || '').trim();
  const places = await listPlaces(city, q);
  return (
    <PlaceChrome>
      <PlacesIndexBody city={city} q={q} places={places} />
    </PlaceChrome>
  );
}
