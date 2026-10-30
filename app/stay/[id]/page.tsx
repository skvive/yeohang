import { dbQuery } from '@/lib/db';
import { LIST_COLUMNS, mapProperty } from '@/lib/domain';
import { PropertyBody, StayChrome } from '@/lib/stay';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function StayPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ draft?: string }>;
}) {
  const { id } = await params;
  const { draft } = await searchParams;
  const row = (await dbQuery(`SELECT * FROM properties WHERE id=$1 AND active=true`, [id]))[0];
  if (!row) notFound();
  const p = mapProperty(row);
  const nearby = (
    p.lat != null && p.lng != null
      ? await dbQuery(
          `SELECT ${LIST_COLUMNS} FROM properties WHERE active=true AND lat BETWEEN 33 AND 39.6 AND lng BETWEEN 124.5 AND 132 AND id<>$1 ORDER BY (lat - $2)^2 + (lng - $3)^2 ASC LIMIT 6`,
          [p.id, p.lat, p.lng],
        )
      : await dbQuery(`SELECT ${LIST_COLUMNS} FROM properties WHERE active=true AND city=$1 AND id<>$2 ORDER BY name LIMIT 6`, [p.city, p.id])
  ).map(mapProperty);
  return (
    <StayChrome>
      <PropertyBody p={p} nearby={nearby} draft={draft} />
    </StayChrome>
  );
}
