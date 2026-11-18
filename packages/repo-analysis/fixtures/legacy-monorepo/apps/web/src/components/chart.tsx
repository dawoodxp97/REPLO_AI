export function Chart({ points }: { points: number[] }) {
  const max = Math.max(...points, 1)
  return (
    <ol>
      {points.map((point, index) => (
        <li key={index} style={{ width: `${(point / max) * 100}%` }} />
      ))}
    </ol>
  )
}
