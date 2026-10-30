import { auth } from '@/lib/auth/server';
import { dbQuery } from '@/lib/db';
import { adminEmails } from '@/lib/domain';

export const runtime = 'nodejs';

export async function GET() {
  const { data } = await auth.getSession();
  const email = data?.user?.email?.toLowerCase();
  if (!email) {
    return Response.json({ authenticated: false, google_configured: Boolean(process.env.NEON_AUTH_BASE_URL) });
  }
  const linked = await dbQuery(`SELECT property_id FROM property_partners WHERE google_email=$1`, [email]);
  return Response.json({
    authenticated: true,
    email,
    admin: adminEmails().has(email),
    csrf: '',
    properties: linked.map((r) => r.property_id),
    owned_blogs: [],
    google_configured: true,
  });
}
