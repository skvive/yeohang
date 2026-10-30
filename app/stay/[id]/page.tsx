import { dbQuery } from '@/lib/db';
import { mapProperty } from '@/lib/domain';
import { PropertyBody, StayChrome } from '@/lib/stay';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function StayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = (await dbQuery(`SELECT * FROM properties WHERE id=$1 AND active=true`, [id]))[0];
  if (!row) notFound();
  const p = mapProperty(row);
  const nearby = (await dbQuery(`SELECT * FROM properties WHERE active=true AND city=$1 AND id<>$2 ORDER BY name LIMIT 3`, [p.city, p.id])).map(mapProperty);
  return (
    <StayChrome>
      <PropertyBody p={p} nearby={nearby} />
    </StayChrome>
  );
}
