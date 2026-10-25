import { getPosts } from '@/lib/posts'

export async function GET() {
  return Response.json(getPosts())
}

export async function POST(request: Request) {
  return Response.json({ received: await request.text() })
}
