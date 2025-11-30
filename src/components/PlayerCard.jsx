import { useState } from 'react';
import './PlayerCard.css';

export default function PlayerCard({ player, index, showTeam = false, compact = false, isLive = false }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [badgeError, setBadgeError] = useState(false);

  const photoUrls = player.photoUrls || [];
  const currentPhoto = photoUrls[photoIndex];
  const allPhotosFailed = photoIndex >= photoUrls.length;

  const animationDelay = `${index * 50}ms`;

  // Compact version for pitch view
  if (compact) {
    return (
      <div className="player-card player-card--compact" style={{ animationDelay }}>
        <div className="player-card__inner">
          {/* Team badge - top left */}
          {player.team && !badgeError && (
            <img
              src={`https://resources.premierleague.com/premierleague/badges/100/t${player.team.code}@x2.png`}
              alt={player.team.shortName}
              className="player-card__team-badge-corner player-card__team-badge-corner--compact"
              onError={() => setBadgeError(true)}
            />
          )}

          {/* Photo */}
          <div className="player-card__photo-wrapper">
            {!imageLoaded && !allPhotosFailed && (
              <div className="player-card__photo-skeleton" />
            )}
            {allPhotosFailed ? (
              <div className="player-card__photo-fallback">
                <span className="player-card__initials player-card__initials--compact">
                  {player.firstName?.charAt(0)}{player.lastName?.charAt(0)}
                </span>
              </div>
            ) : (
              <img
                src={currentPhoto}
                alt={player.webName}
                className={`player-card__photo ${imageLoaded ? 'loaded' : ''}`}
                onLoad={() => setImageLoaded(true)}
                onError={() => {
                  setImageLoaded(false);
                  setPhotoIndex(prev => prev + 1);
                }}
              />
            )}
            <div className="player-card__photo-overlay" />
          </div>

          {/* Compact info */}
          <div className="player-card__info player-card__info--compact">
            <div className="player-card__name player-card__name--compact">{player.webName}</div>
            <div className="player-card__compact-stats">
              <span className={`player-card__compact-pts ${player.hasLiveData && player.livePoints > 0 ? 'player-card__compact-pts--up' : ''} ${player.hasLiveData && player.livePoints < 0 ? 'player-card__compact-pts--down' : ''}`}>
                {player.hasLiveData ? player.totalPoints + player.livePoints : player.totalPoints}
                {player.hasLiveData && player.livePoints > 0 && (
                  <span className="player-card__compact-change player-card__compact-change--up">↑{player.livePoints}</span>
                )}
                {player.hasLiveData && player.livePoints < 0 && (
                  <span className="player-card__compact-change player-card__compact-change--down">↓{Math.abs(player.livePoints)}</span>
                )}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="player-card" style={{ animationDelay }}>
      <div className="player-card__inner">
        {/* Team badge - top left */}
        {showTeam && player.team && !badgeError && (
          <img
            src={`https://resources.premierleague.com/premierleague/badges/100/t${player.team.code}@x2.png`}
            alt={player.team.shortName}
            className="player-card__team-badge-corner"
            title={player.team.name}
            onError={() => setBadgeError(true)}
          />
        )}
        {showTeam && player.team && badgeError && (
          <div className="player-card__team-badge-fallback" title={player.team.name}>
            {player.team.shortName}
          </div>
        )}

        {/* Position badge */}
        <div className="player-card__position">{player.position}</div>

        {/* Price */}
        <div className="player-card__price">
          <span className="player-card__price-value">{player.price.toFixed(1)}</span>
          <span className="player-card__price-unit">m</span>
        </div>

        {/* Photo */}
        <div className="player-card__photo-wrapper">
          {!imageLoaded && !allPhotosFailed && (
            <div className="player-card__photo-skeleton" />
          )}
          {allPhotosFailed ? (
            <div className="player-card__photo-fallback">
              <span className="player-card__initials">
                {player.firstName?.charAt(0)}{player.lastName?.charAt(0)}
              </span>
            </div>
          ) : (
            <img
              src={currentPhoto}
              alt={player.webName}
              className={`player-card__photo ${imageLoaded ? 'loaded' : ''}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                setImageLoaded(false);
                setPhotoIndex(prev => prev + 1);
              }}
            />
          )}
          <div className="player-card__photo-overlay" />
        </div>

        {/* Info */}
        <div className="player-card__info">
          <div className="player-card__name-row">
            <div className="player-card__first-name">{player.firstName}</div>
            <div className="player-card__name">{player.webName}</div>
          </div>
        </div>

        {/* Stats row */}
        <div className="player-card__stats">
          <div className="player-card__stat">
            <span className={`player-card__stat-value ${player.hasLiveData && player.livePoints > 0 ? 'player-card__stat-value--up' : ''} ${player.hasLiveData && player.livePoints < 0 ? 'player-card__stat-value--down' : ''}`}>
              {player.hasLiveData ? player.totalPoints + player.livePoints : player.totalPoints}
              {player.hasLiveData && player.livePoints > 0 && (
                <span className="player-card__stat-change player-card__stat-change--up">↑{player.livePoints}</span>
              )}
              {player.hasLiveData && player.livePoints < 0 && (
                <span className="player-card__stat-change player-card__stat-change--down">↓{Math.abs(player.livePoints)}</span>
              )}
            </span>
            <span className="player-card__stat-label">PTS</span>
          </div>
          <div className="player-card__stat">
            <span className="player-card__stat-value">{player.form}</span>
            <span className="player-card__stat-label">FORM</span>
          </div>
          <div className="player-card__stat">
            <span className="player-card__stat-value">{player.xGI.toFixed(1)}</span>
            <span className="player-card__stat-label">xGI</span>
          </div>
        </div>

        {/* Status line - bottom of card */}
        <div
          className="player-card__status"
          style={{ '--status-color': player.status.color }}
          title={player.status.text}
        />

        {/* Expanded stats on hover */}
        <div className="player-card__expanded">
          {player.news && (
            <div className="player-card__news">{player.news}</div>
          )}

          {/* Live GW Stats - show only when games are actively playing */}
          {isLive && player.hasLiveData && (
            <div className="player-card__live-section">
              <div className="player-card__live-header">
                <span className="player-card__live-dot"></span>
                <span>LIVE GW</span>
              </div>
              <div className="player-card__live-grid">
                <div className="player-card__live-stat">
                  <span className="value">
                    {player.livePoints}
                    {player.pointsChange !== 0 && (
                      <span className={`player-card__change ${player.pointsChange > 0 ? 'player-card__change--up' : 'player-card__change--down'}`}>
                        {player.pointsChange > 0 ? `+${player.pointsChange}` : player.pointsChange}
                      </span>
                    )}
                  </span>
                  <span className="label">PTS</span>
                </div>
                <div className="player-card__live-stat">
                  <span className="value">{player.liveMinutes}'</span>
                  <span className="label">MIN</span>
                </div>
                <div className="player-card__live-stat">
                  <span className="value">
                    {player.liveGoals}
                    {player.goalsChange > 0 && (
                      <span className="player-card__change player-card__change--up">+{player.goalsChange}</span>
                    )}
                  </span>
                  <span className="label">GLS</span>
                </div>
                <div className="player-card__live-stat">
                  <span className="value">
                    {player.liveAssists}
                    {player.assistsChange > 0 && (
                      <span className="player-card__change player-card__change--up">+{player.assistsChange}</span>
                    )}
                  </span>
                  <span className="label">AST</span>
                </div>
                <div className="player-card__live-stat">
                  <span className="value">
                    {player.liveBps}
                    {player.bpsChange !== 0 && (
                      <span className={`player-card__change ${player.bpsChange > 0 ? 'player-card__change--up' : 'player-card__change--down'}`}>
                        {player.bpsChange > 0 ? `+${player.bpsChange}` : player.bpsChange}
                      </span>
                    )}
                  </span>
                  <span className="label">BPS</span>
                </div>
                <div className="player-card__live-stat">
                  <span className="value">
                    {player.liveBonus}
                    {player.bonusChange !== 0 && (
                      <span className={`player-card__change ${player.bonusChange > 0 ? 'player-card__change--up' : 'player-card__change--down'}`}>
                        {player.bonusChange > 0 ? `+${player.bonusChange}` : player.bonusChange}
                      </span>
                    )}
                  </span>
                  <span className="label">BNS</span>
                </div>
              </div>
            </div>
          )}

          <div className="player-card__expanded-grid">
            <div className="player-card__expanded-stat">
              <span className="label">Goals</span>
              <span className="value">{player.goals}</span>
            </div>
            <div className="player-card__expanded-stat">
              <span className="label">Assists</span>
              <span className="value">{player.assists}</span>
            </div>
            <div className="player-card__expanded-stat">
              <span className="label">xG</span>
              <span className="value">{player.xG.toFixed(2)}</span>
            </div>
            <div className="player-card__expanded-stat">
              <span className="label">xA</span>
              <span className="value">{player.xA.toFixed(2)}</span>
            </div>
            <div className="player-card__expanded-stat">
              <span className="label">Minutes</span>
              <span className="value">{player.minutes}</span>
            </div>
            <div className="player-card__expanded-stat">
              <span className="label">Bonus</span>
              <span className="value">{player.bonus}</span>
            </div>
            <div className="player-card__expanded-stat">
              <span className="label">Selected</span>
              <span className="value">{player.selectedBy}%</span>
            </div>
            <div className="player-card__expanded-stat">
              <span className="label">ICT</span>
              <span className="value">{player.ictIndex}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
