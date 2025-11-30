import { useState } from 'react';
import './TeamIdModal.css';

export default function TeamIdModal({ onSubmit, onClose, isLoading, error, currentGameweek }) {
  const [teamId, setTeamId] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    const id = teamId.trim();
    if (id && /^\d+$/.test(id)) {
      onSubmit(id);
    }
  };

  return (
    <div className="team-id-overlay">
      <div className="team-id-modal">
        {currentGameweek && (
          <span className="team-id-modal__gw">GW{currentGameweek}</span>
        )}
        <h2 className="team-id-modal__title">Enter Your FPL Team ID</h2>
        <p className="team-id-modal__desc">
          Find your Team ID in the FPL app under "Pick Team" - it's the number in the URL
        </p>

        <form onSubmit={handleSubmit} className="team-id-modal__form">
          <input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={teamId}
            onChange={(e) => setTeamId(e.target.value.replace(/\D/g, ''))}
            placeholder="e.g. 2076497"
            className="team-id-modal__input"
            autoFocus
            disabled={isLoading}
          />

          {error && (
            <p className="team-id-modal__error">{error}</p>
          )}

          <div className="team-id-modal__actions">
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="team-id-modal__btn team-id-modal__btn--secondary"
                disabled={isLoading}
              >
                Skip
              </button>
            )}
            <button
              type="submit"
              className="team-id-modal__btn team-id-modal__btn--primary"
              disabled={!teamId || isLoading}
            >
              {isLoading ? 'Loading...' : 'Load Team'}
            </button>
          </div>
        </form>

        <p className="team-id-modal__hint">
          Don't have an FPL team? <a href="https://fantasy.premierleague.com" target="_blank" rel="noopener noreferrer">Create one here</a>
        </p>
      </div>
    </div>
  );
}
