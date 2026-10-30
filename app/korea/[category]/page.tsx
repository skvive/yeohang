import { dbQuery } from '@/lib/db';
import { CATEGORY_SLUGS, mapProperty } from '@/lib/domain';
import { CategoryBody, StayChrome } from '@/lib/stay';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  if (!CATEGORY_SLUGS[category]) notFound();
  const rows = (
    await dbQuery(
      `SELECT * FROM properties WHERE active=true AND category=$1 ORDER BY coalesce(review_count,0) DESC, name LIMIT 80`,
      [CATEGORY_SLUGS[category]],
    )
  ).map(mapProperty);
  return (
    <StayChrome>
      <CategoryBody slug={category} rows={rows} />
    </StayChrome>
  );
}
