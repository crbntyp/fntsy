import { useState } from 'react';
import './TeamHeader.css';

export default function TeamHeader({ team, currentGameweek }) {
  const [badgeError, setBadgeError] = useState(false);

  // Use Premier League resources with rb (retina badge) path
  const badgeUrl = `https://resources.premierleague.com/premierleague/badges/rb/t${team.code}.svg`;

  return (
    <header className="team-header">
      <div className="team-header__glow" />

      <div className="team-header__content">
        <div className="team-header__badge">
          {!badgeError ? (
            <img
              src={badgeUrl}
              alt={team.name}
              className="team-header__badge-img"
              onError={() => setBadgeError(true)}
            />
          ) : (
            <div className="team-header__badge-fallback">
              {team.shortName}
            </div>
          )}
        </div>

        <div className="team-header__info">
          <h1 className="team-header__name">{team.name}</h1>
          <div className="team-header__meta">
            <span className="team-header__gw">Gameweek {currentGameweek}</span>
            <span className="team-header__divider">|</span>
            <span className="team-header__strength">
              Strength: {team.strength}
            </span>
          </div>
        </div>

        <div className="team-header__stats">
          <div className="team-header__stat-group">
            <span className="team-header__stat-label">Attack</span>
            <div className="team-header__stat-values">
              <span className="team-header__stat" title="Home Attack">
                <span className="icon">H</span>
                {team.attackHome}
              </span>
              <span className="team-header__stat" title="Away Attack">
                <span className="icon">A</span>
                {team.attackAway}
              </span>
            </div>
          </div>
          <div className="team-header__stat-group">
            <span className="team-header__stat-label">Defence</span>
            <div className="team-header__stat-values">
              <span className="team-header__stat" title="Home Defence">
                <span className="icon">H</span>
                {team.defenceHome}
              </span>
              <span className="team-header__stat" title="Away Defence">
                <span className="icon">A</span>
                {team.defenceAway}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="team-header__border" />
    </header>
  );
}
