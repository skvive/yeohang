import { handleApi } from '@/lib/handler';

export const runtime = 'nodejs';

type Ctx = { params: Promise<{ slug: string[] }> };

export async function GET(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  return handleApi(req, slug);
}

export async function POST(req: Request, ctx: Ctx) {
  const { slug } = await ctx.params;
  return handleApi(req, slug);
}
