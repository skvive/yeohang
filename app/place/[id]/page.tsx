import { getPlace, listPosts, listVideos, nearbyStays } from '@/lib/places';
import { PlaceBody, PlaceChrome } from '@/lib/place';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PlacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const place = await getPlace(id);
  if (!place) notFound();
  const [stays, media, posts] = await Promise.all([
    nearbyStays(place.city, 4),
    listVideos(place.city, place.id),
    listPosts(place.city, place.id),
  ]);
  const shorts = media.filter((v) => v.kind === 'shorts');
  const videos = media.filter((v) => v.kind !== 'shorts');
  return (
    <PlaceChrome>
      <PlaceBody place={place} stays={stays} videos={videos} shorts={shorts} posts={posts} />
    </PlaceChrome>
  );
}
