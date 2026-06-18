interface RevisionChecklistProps {
  items: string[]
}

export function RevisionChecklist({ items }: RevisionChecklistProps) {
  if (!items.length) {
    return null
  }

  return (
    <ul className="revision-list">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  )
}
