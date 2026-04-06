export const LoadingPanel = ({ label = "Loading..." }: { label?: string }) => (
  <div className="panel">
    <p className="muted">{label}</p>
  </div>
);

export const ErrorPanel = ({
  message,
  onRetry
}: {
  message: string;
  onRetry?: () => void;
}) => (
  <div className="panel alert alert-error stack" role="alert">
    <strong>Unable to load data</strong>
    <span>{message}</span>
    {onRetry ? (
      <div>
        <button className="btn btn-secondary" type="button" onClick={onRetry}>
          Retry
        </button>
      </div>
    ) : null}
  </div>
);
