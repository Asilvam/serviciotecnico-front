type ListLoadingStateProps = {
  label: string
}

export default function ListLoadingState({ label }: ListLoadingStateProps) {
  return (
    <div className="state-card list-loading-state" role="status">
      <p>{label}</p>
    </div>
  )
}
