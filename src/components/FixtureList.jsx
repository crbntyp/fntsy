import './FixtureList.css';

const DIFFICULTY_COLORS = {
  1: '#00FF87', // Very easy
  2: '#00FF87', // Easy
  3: '#E7E7E7', // Medium
  4: '#FF2882', // Hard
  5: '#7B0041'  // Very hard
};

export default function FixtureList({ fixtures, currentGameweek }) {
  const upcomingFixtures = fixtures
    .filter(f => !f.finished)
    .slice(0, 6);

  const recentResults = fixtures
    .filter(f => f.finished)
    .slice(-5)
    .reverse();

  function formatDate(date) {
    if (!date) return 'TBD';
    return date.toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short'
    });
  }

  function formatTime(date) {
    if (!date) return '';
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  return (
    <div className="fixture-list">
      {/* Upcoming Fixtures */}
      <div className="fixture-section">
        <h3 className="fixture-section__title">
          <span className="fixture-section__title-text">Upcoming</span>
          <span className="fixture-section__title-line" />
        </h3>
        <div className="fixtures">
          {upcomingFixtures.map((fixture, index) => (
            <div
              key={fixture.id}
              className="fixture"
              style={{ animationDelay: `${index * 80}ms` }}
            >
              <div className="fixture__gw">GW{fixture.gameweek}</div>
              <div className="fixture__opponent">
                <span className={`fixture__venue ${fixture.isHome ? 'home' : 'away'}`}>
                  {fixture.isHome ? 'H' : 'A'}
                </span>
                <span className="fixture__team">{fixture.opponent.shortName}</span>
              </div>
              <div
                className="fixture__difficulty"
                style={{ backgroundColor: DIFFICULTY_COLORS[fixture.difficulty] }}
                title={`Difficulty: ${fixture.difficulty}`}
              />
              <div className="fixture__date">
                <span className="fixture__date-day">{formatDate(fixture.kickoff)}</span>
                <span className="fixture__date-time">{formatTime(fixture.kickoff)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Results */}
      <div className="fixture-section">
        <h3 className="fixture-section__title">
          <span className="fixture-section__title-text">Recent</span>
          <span className="fixture-section__title-line" />
        </h3>
        <div className="fixtures fixtures--results">
          {recentResults.map((fixture, index) => {
            const isWin = fixture.isHome
              ? fixture.homeScore > fixture.awayScore
              : fixture.awayScore > fixture.homeScore;
            const isDraw = fixture.homeScore === fixture.awayScore;
            const resultClass = isWin ? 'win' : isDraw ? 'draw' : 'loss';

            return (
              <div
                key={fixture.id}
                className="fixture fixture--result"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="fixture__gw">GW{fixture.gameweek}</div>
                <div className="fixture__opponent">
                  <span className={`fixture__venue ${fixture.isHome ? 'home' : 'away'}`}>
                    {fixture.isHome ? 'H' : 'A'}
                  </span>
                  <span className="fixture__team">{fixture.opponent.shortName}</span>
                </div>
                <div className={`fixture__result fixture__result--${resultClass}`}>
                  {fixture.isHome
                    ? `${fixture.homeScore}-${fixture.awayScore}`
                    : `${fixture.awayScore}-${fixture.homeScore}`}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
