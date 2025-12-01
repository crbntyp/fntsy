import './FDRCalendar.css';

// FDR colors (1 = easiest, 5 = hardest)
const FDR_COLORS = {
  1: '#00ff87', // Bright green
  2: '#01fc7a', // Green
  3: '#6b7280', // Gray
  4: '#ff1744', // Red
  5: '#7b0019', // Dark red
};

export default function FDRCalendar({ fixtures }) {
  if (!fixtures?.length) return null;

  return (
    <div className="fdr-calendar">
      <h3 className="fdr-calendar__title">Fixture Difficulty</h3>
      <div className="fdr-calendar__grid">
        {fixtures.map((fixture, index) => (
          <div
            key={index}
            className="fdr-calendar__item"
            style={{
              borderColor: FDR_COLORS[fixture.difficulty] || FDR_COLORS[3],
            }}
          >
            <span className="fdr-calendar__gw">GW{fixture.gameweek}</span>
            <img
              src={`https://resources.premierleague.com/premierleague/badges/100/t${fixture.opponent?.code}@x2.png`}
              alt={fixture.opponent?.shortName}
              className="fdr-calendar__badge"
            />
            <span className="fdr-calendar__opponent">{fixture.opponent?.shortName}</span>
            <span className="fdr-calendar__venue">{fixture.isHome ? 'H' : 'A'}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
