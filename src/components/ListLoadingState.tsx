type ListLoadingStateProps = {
  label: string
}

export default function ListLoadingState({ label }: ListLoadingStateProps) {
  return (
    <div className="state-card list-loading-state" role="status">
      <span className="btn-spinner list-loading-spinner" aria-hidden="true" />
      <p>{label}</p>
    </div>
  )
}
