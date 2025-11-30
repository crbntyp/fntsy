import PlayerCard from './PlayerCard';
import './MyTeam.css';

export default function MyTeam({ myTeam, isLive, onClose, onClearTeam }) {
  if (!myTeam) return null;

  const starters = myTeam.squad.filter(p => !p.isBench);
  const bench = myTeam.squad.filter(p => p.isBench);

  // Group starters by position
  const gkp = starters.filter(p => p.position === 'GKP');
  const def = starters.filter(p => p.position === 'DEF');
  const mid = starters.filter(p => p.position === 'MID');
  const fwd = starters.filter(p => p.position === 'FWD');
  const formation = `${def.length}-${mid.length}-${fwd.length}`;

  // Calculate GW points (live or from API)
  const hasAnyLiveData = myTeam.squad.some(p => p.hasLiveData);
  const calculatedGWPoints = hasAnyLiveData
    ? myTeam.squad.reduce((total, player) => {
        if (player.isBench) return total;
        const pts = player.livePoints || 0;
        return total + (pts * player.multiplier);
      }, 0)
    : myTeam.gameweekPoints;

  return (
    <div className="my-team-overlay" onClick={onClose}>
      {/* Close text outside modal */}
      <button className="my-team-overlay__close" onClick={onClose}>CLOSE</button>

      <div className="my-team-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="my-team-modal__header">
          <div className="my-team-modal__info">
            <h2 className="my-team-modal__name">{myTeam.name}</h2>
            <p className="my-team-modal__manager">{myTeam.managerName}</p>
          </div>
          <div className="my-team-modal__stats">
            {onClearTeam && (
              <button className="my-team-modal__change-btn" onClick={onClearTeam}>
                Change Team
              </button>
            )}
            <div className="my-team-modal__stat">
              <span className="my-team-modal__stat-value">{calculatedGWPoints}</span>
              <span className="my-team-modal__stat-label">GW</span>
            </div>
            <div className="my-team-modal__stat">
              <span className="my-team-modal__stat-value">{myTeam.overallPoints?.toLocaleString()}</span>
              <span className="my-team-modal__stat-label">TOT</span>
            </div>
          </div>
        </div>

        {/* Pitch */}
        <div className="my-team-pitch">
          {/* Formation badge */}
          <span className="my-team-pitch__formation">{formation}</span>

          {/* Pitch markings */}
          <div className="my-team-pitch__markings">
            <div className="my-team-pitch__center-circle" />
            <div className="my-team-pitch__penalty-box" />
            <div className="my-team-pitch__goal-box" />
          </div>

          {/* Formation rows */}
          <div className="my-team-pitch__row my-team-pitch__row--fwd">
            {fwd.map((player, index) => (
              <div key={player.id} className="my-team-pitch__player">
                <PlayerCard player={player} index={index} compact />
                {player.isCaptain && <div className="my-team-pitch__badge my-team-pitch__badge--captain">C</div>}
                {player.isViceCaptain && <div className="my-team-pitch__badge my-team-pitch__badge--vice">V</div>}
              </div>
            ))}
          </div>

          <div className="my-team-pitch__row my-team-pitch__row--mid">
            {mid.map((player, index) => (
              <div key={player.id} className="my-team-pitch__player">
                <PlayerCard player={player} index={index} compact />
                {player.isCaptain && <div className="my-team-pitch__badge my-team-pitch__badge--captain">C</div>}
                {player.isViceCaptain && <div className="my-team-pitch__badge my-team-pitch__badge--vice">V</div>}
              </div>
            ))}
          </div>

          <div className="my-team-pitch__row my-team-pitch__row--def">
            {def.map((player, index) => (
              <div key={player.id} className="my-team-pitch__player">
                <PlayerCard player={player} index={index} compact />
                {player.isCaptain && <div className="my-team-pitch__badge my-team-pitch__badge--captain">C</div>}
                {player.isViceCaptain && <div className="my-team-pitch__badge my-team-pitch__badge--vice">V</div>}
              </div>
            ))}
          </div>

          <div className="my-team-pitch__row my-team-pitch__row--gkp">
            {gkp.map((player, index) => (
              <div key={player.id} className="my-team-pitch__player">
                <PlayerCard player={player} index={index} compact />
                {player.isCaptain && <div className="my-team-pitch__badge my-team-pitch__badge--captain">C</div>}
                {player.isViceCaptain && <div className="my-team-pitch__badge my-team-pitch__badge--vice">V</div>}
              </div>
            ))}
          </div>
        </div>

        {/* Bench */}
        <div className="my-team-bench">
          <span className="my-team-bench__label">BENCH</span>
          <div className="my-team-bench__players">
            {bench.map((player, index) => (
              <div key={player.id} className="my-team-pitch__player">
                <PlayerCard player={player} index={index} compact />
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
