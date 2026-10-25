export interface Post {
  slug: string
  title: string
}

export const POSTS: Post[] = [{ slug: 'hello', title: 'Hello' }]

export function getPosts(): Post[] {
  return POSTS
}
