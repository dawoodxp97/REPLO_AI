export default function Post({ params }: { params: { slug: string } }) {
  return <h1>{params.slug}</h1>
}
