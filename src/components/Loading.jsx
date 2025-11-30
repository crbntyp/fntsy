import './Loading.css';

export default function Loading() {
  return (
    <div className="loading">
      <div className="loading__content">
        <div className="loading__spinner">
          <div className="loading__ring" />
          <div className="loading__ring" />
          <div className="loading__ring" />
        </div>
        <p className="loading__text">Loading squad data...</p>
      </div>
    </div>
  );
}
