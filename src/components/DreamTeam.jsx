import PlayerCard from './PlayerCard';
import './MyTeam.css';

export default function DreamTeam({ dreamTeam, gameweek, onClose }) {
  if (!dreamTeam) return null;

  const { gkp, def, mid, fwd, totalPoints } = dreamTeam;

  // Determine formation
  const formation = `${def.length}-${mid.length}-${fwd.length}`;

  return (
    <div className="my-team-overlay" onClick={onClose}>
      {/* Close text outside modal */}
      <button className="my-team-overlay__close" onClick={onClose}>CLOSE</button>

      <div className="my-team-modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="my-team-modal__header">
          <div className="my-team-modal__info">
            <h2 className="my-team-modal__name">Dream Team</h2>
            <p className="my-team-modal__manager">GW{gameweek} Best XI</p>
          </div>
          <div className="my-team-modal__stats">
            <div className="my-team-modal__stat">
              <span className="my-team-modal__stat-value">{totalPoints}</span>
              <span className="my-team-modal__stat-label">PTS</span>
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
              </div>
            ))}
          </div>

          <div className="my-team-pitch__row my-team-pitch__row--mid">
            {mid.map((player, index) => (
              <div key={player.id} className="my-team-pitch__player">
                <PlayerCard player={player} index={index} compact />
              </div>
            ))}
          </div>

          <div className="my-team-pitch__row my-team-pitch__row--def">
            {def.map((player, index) => (
              <div key={player.id} className="my-team-pitch__player">
                <PlayerCard player={player} index={index} compact />
              </div>
            ))}
          </div>

          <div className="my-team-pitch__row my-team-pitch__row--gkp">
            {gkp.map((player, index) => (
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
