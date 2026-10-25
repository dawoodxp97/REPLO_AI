import { getPosts } from '@/lib/posts'
import { Button } from '@/components/Button'

export default async function Home() {
  const posts = getPosts()
  return <Button label={`${posts.length} posts`} />
}
