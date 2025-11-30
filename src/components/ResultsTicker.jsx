import './ResultsTicker.css';

export default function ResultsTicker({ results, gameweek }) {
  if (!results || results.length === 0) return null;

  // Double the results for seamless loop
  const doubledResults = [...results, ...results];

  return (
    <div className="results-ticker">
      <div className="results-ticker__gw">
        <span>GW {gameweek || '?'}</span>
      </div>
      <div className="results-ticker__content">
        <div className="results-ticker__track">
          {doubledResults.map((result, i) => {
            const kickoff = result.kickoffTime ? new Date(result.kickoffTime) : null;
            const timeStr = kickoff ? kickoff.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : '';

            return (
              <div key={`${result.id}-${i}`} className="results-ticker__item">
                <img
                  src={`https://resources.premierleague.com/premierleague/badges/100/t${result.homeTeam?.code}@x2.png`}
                  alt={result.homeTeam?.shortName}
                  className="results-ticker__badge"
                />
                <span className="results-ticker__score">
                  {result.homeScore} - {result.awayScore}
                </span>
                <img
                  src={`https://resources.premierleague.com/premierleague/badges/100/t${result.awayTeam?.code}@x2.png`}
                  alt={result.awayTeam?.shortName}
                  className="results-ticker__badge"
                />
                {result.homeTeam?.stadium && (
                  <span className="results-ticker__stadium">{result.homeTeam.stadium}</span>
                )}
                {timeStr && (
                  <span className="results-ticker__time">{timeStr}</span>
                )}
                {result.yellowCards > 0 && (
                  <span className="results-ticker__cards results-ticker__cards--yellow">
                    <span className="results-ticker__card-icon"></span>
                    {result.yellowCards}
                  </span>
                )}
                {result.redCards > 0 && (
                  <span className="results-ticker__cards results-ticker__cards--red">
                    <span className="results-ticker__card-icon"></span>
                    {result.redCards}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
