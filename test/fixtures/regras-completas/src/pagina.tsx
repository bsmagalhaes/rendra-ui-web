export function Pagina({ n }: { n: number }) {
  const cor = '#ff0000'
  const fonte = "Inter, sans-serif"
  const raio = { borderRadius: 4 }
  const ponte = 'var(--color-primary)'
  const propria = 'var(--primary)'
  return (
    <div className="p-[13px]" style={{ color: 'red' }}>
      <div className="h-screen" />
      <div className="p-5" />
      <div className={`p-${n}`} />
      <p className="max-w-md text-primary">texto</p>
      {cor}
      {fonte}
      {raio}
      {ponte}
      {propria}
    </div>
  )
}
