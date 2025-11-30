import { useState, useMemo, useEffect } from 'react';
import { useFPLData, useMyTeam, getTopPlayersByPosition, getPlayersByTeam } from './hooks/useFPLData';
import PlayerCard from './components/PlayerCard';
import ResultsTicker from './components/ResultsTicker';
import MyTeam from './components/MyTeam';
import TeamIdModal from './components/TeamIdModal';
import Loading from './components/Loading';
import StadiumBackground from './components/StadiumBackground';
import './App.css';

const STORAGE_KEY = 'fntsy_team_id';

const POSITION_NAMES = {
  GKP: 'Goalkeepers',
  DEF: 'Defenders',
  MID: 'Midfielders',
  FWD: 'Forwards'
};

const getSortOptions = (isLive, currentGW) => ({
  left: [
    { value: 'livePoints', label: isLive ? 'Live' : `GW${currentGW}` },
    { value: 'totalPoints', label: 'Points' },
    { value: 'price', label: 'Price' }
  ],
  right: [
    { value: 'selectedBy', label: 'Ownership' },
    { value: 'transfersIn', label: 'Ins' },
    { value: 'transfersOut', label: 'Outs' }
  ]
});

function App() {
  const { data, loading, error, isLive, lastUpdated } = useFPLData();
  const [viewMode, setViewMode] = useState('top'); // 'top' or 'team'
  const [selectedTeamId, setSelectedTeamId] = useState(null);
  const [sortBy, setSortBy] = useState('livePoints');
  const [showMyTeam, setShowMyTeam] = useState(false);
  const [showTeamIdModal, setShowTeamIdModal] = useState(false);
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);

  // User's FPL team ID from localStorage
  const [myTeamId, setMyTeamId] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? Number(stored) : null;
  });
  const [teamIdError, setTeamIdError] = useState(null);

  // Fetch user's FPL team
  const { myTeam, loading: myTeamLoading, error: myTeamError } = useMyTeam(
    myTeamId,
    data?.players,
    data?.currentGameweek
  );

  // Handle team ID submission
  const handleTeamIdSubmit = (id) => {
    setTeamIdError(null);
    setMyTeamId(Number(id));
    localStorage.setItem(STORAGE_KEY, id);
  };

  // Auto-show team when new team loaded while modal is open
  useEffect(() => {
    if (myTeamId && myTeam && showTeamIdModal) {
      setShowTeamIdModal(false);
      setShowMyTeam(true);
    }
  }, [myTeamId, myTeam, showTeamIdModal]);

  // Handle errors from loading team
  useEffect(() => {
    if (myTeamError && myTeamId) {
      setTeamIdError('Team not found. Check your ID and try again.');
      localStorage.removeItem(STORAGE_KEY);
      setMyTeamId(null);
    }
  }, [myTeamError, myTeamId]);

  // Handle My Team button click
  const handleMyTeamClick = () => {
    if (myTeam) {
      setShowMyTeam(true);
    } else {
      setShowTeamIdModal(true);
    }
  };

  // Clear team and show input modal
  const handleClearTeam = () => {
    localStorage.removeItem(STORAGE_KEY);
    setMyTeamId(null);
    setShowMyTeam(false);
    setShowTeamIdModal(true);
  };

  // Get displayed players based on view mode
  const displayData = useMemo(() => {
    if (!data) return null;

    if (viewMode === 'top') {
      return {
        type: 'top',
        playersByPosition: getTopPlayersByPosition(data.players, sortBy, 10)
      };
    } else {
      const teamId = selectedTeamId || data.teams[0]?.id;
      const team = data.teams.find(t => t.id === teamId);
      return {
        type: 'team',
        team,
        players: getPlayersByTeam(data.players, teamId)
      };
    }
  }, [data, viewMode, selectedTeamId, sortBy]);

  if (loading) return <Loading />;

  if (error) {
    return (
      <div className="error">
        <h2>Failed to load data</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Retry</button>
      </div>
    );
  }

  const { players, teams, currentGameweek, resultsGameweek, recentResults } = data;

  return (
    <div className="app">
      <StadiumBackground />
      <ResultsTicker results={recentResults} gameweek={resultsGameweek} />
      <div className="container">
        {/* Header */}
        <header className="app-header">
          <div className="app-header__title">
            <h1 className="app-header__name">fntsy</h1>
          </div>
          {/* Team badges */}
          <div className="app-header__teams">
            {teams.map(team => (
              <button
                key={team.id}
                className={`app-header__team-btn ${viewMode === 'team' && selectedTeamId === team.id ? 'active' : ''}`}
                onClick={() => {
                  setViewMode('team');
                  setSelectedTeamId(team.id);
                }}
                title={team.name}
              >
                <img
                  src={`https://resources.premierleague.com/premierleague/badges/100/t${team.code}@x2.png`}
                  alt={team.shortName}
                  className="app-header__team-badge"
                />
              </button>
            ))}
          </div>
        </header>

        {/* Controls */}
        <div className="controls">
          <div className="controls__left">
            {/* Back button when not in top view */}
            {viewMode !== 'top' && (
              <button
                className="toggle-btn"
                onClick={() => setViewMode('top')}
              >
                ← Back
              </button>
            )}

            {/* Sort buttons - left group (desktop) */}
            {viewMode === 'top' && (
              <div className="sort-group sort-group--desktop">
                {getSortOptions(isLive, data?.currentGameweek).left.map(opt => (
                  <button
                    key={opt.value}
                    className={`sort-btn ${sortBy === opt.value ? 'active' : ''}`}
                    onClick={() => setSortBy(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            {/* Team Selector - only show in team view (desktop) */}
            {viewMode === 'team' && (
              <select
                value={selectedTeamId || teams[0]?.id}
                onChange={(e) => setSelectedTeamId(Number(e.target.value))}
                className="team-select team-select--desktop"
              >
                {teams.map(team => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            )}

            {/* Mobile dropdowns container */}
            <div className="controls__mobile-dropdowns">
              {/* Team Dropdown - mobile */}
              <div className="filter-dropdown">
                <button
                  className="filter-dropdown__trigger"
                  onClick={() => {
                    setTeamDropdownOpen(!teamDropdownOpen);
                    setFilterDropdownOpen(false);
                  }}
                >
                  {selectedTeamId ? (
                    <>
                      <img
                        src={`https://resources.premierleague.com/premierleague/badges/100/t${teams.find(t => t.id === selectedTeamId)?.code}@x2.png`}
                        alt=""
                        className="filter-dropdown__badge"
                      />
                      <span>{teams.find(t => t.id === selectedTeamId)?.shortName}</span>
                    </>
                  ) : (
                    <span>All Teams</span>
                  )}
                  <svg className="filter-dropdown__arrow" width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M8 11L3 6h10l-5 5z" />
                  </svg>
                </button>
                {teamDropdownOpen && (
                  <div className="filter-dropdown__menu">
                    <button
                      className={`filter-dropdown__item ${!selectedTeamId ? 'active' : ''}`}
                      onClick={() => {
                        setViewMode('top');
                        setSelectedTeamId(null);
                        setTeamDropdownOpen(false);
                      }}
                    >
                      <span>All Teams</span>
                    </button>
                    {teams.map(team => (
                      <button
                        key={team.id}
                        className={`filter-dropdown__item ${selectedTeamId === team.id ? 'active' : ''}`}
                        onClick={() => {
                          setViewMode('team');
                          setSelectedTeamId(team.id);
                          setTeamDropdownOpen(false);
                        }}
                      >
                        <img
                          src={`https://resources.premierleague.com/premierleague/badges/100/t${team.code}@x2.png`}
                          alt=""
                          className="filter-dropdown__badge"
                        />
                        <span>{team.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Filter Dropdown - mobile */}
              {viewMode === 'top' && (
                <div className="filter-dropdown">
                  <button
                    className="filter-dropdown__trigger"
                    onClick={() => {
                      setFilterDropdownOpen(!filterDropdownOpen);
                      setTeamDropdownOpen(false);
                    }}
                  >
                    <span>{[...getSortOptions(isLive, data?.currentGameweek).left, ...getSortOptions(isLive, data?.currentGameweek).right].find(opt => opt.value === sortBy)?.label}</span>
                    <svg className="filter-dropdown__arrow" width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 11L3 6h10l-5 5z" />
                    </svg>
                  </button>
                  {filterDropdownOpen && (
                    <div className="filter-dropdown__menu">
                      {[...getSortOptions(isLive, data?.currentGameweek).left, ...getSortOptions(isLive, data?.currentGameweek).right].map(opt => (
                        <button
                          key={opt.value}
                          className={`filter-dropdown__item ${sortBy === opt.value ? 'active' : ''}`}
                          onClick={() => {
                            setSortBy(opt.value);
                            setFilterDropdownOpen(false);
                          }}
                        >
                          <span>{opt.label}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="controls__right">
            {/* Live indicator */}
            {isLive && (
              <div className="live-indicator">
                <span className="live-indicator__dot"></span>
                <span className="live-indicator__text">LIVE</span>
                {lastUpdated && (
                  <span className="live-indicator__time">
                    {lastUpdated.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>
            )}

            {/* Sort buttons - right group (desktop) */}
            {viewMode === 'top' && (
              <div className="sort-group sort-group--desktop">
                {getSortOptions(isLive, data?.currentGameweek).right.map(opt => (
                  <button
                    key={opt.value}
                    className={`sort-btn ${sortBy === opt.value ? 'active' : ''}`}
                    onClick={() => setSortBy(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

          </div>
        </div>

        {/* My Team button - top right */}
        <button
          className="myteam-btn"
          onClick={handleMyTeamClick}
        >
          {myTeamLoading ? 'Loading...' : 'My Team'}
        </button>

        {/* Team ID Modal */}
        {showTeamIdModal && (
          <TeamIdModal
            onSubmit={handleTeamIdSubmit}
            onClose={() => setShowTeamIdModal(false)}
            isLoading={myTeamLoading}
            error={teamIdError}
            currentGameweek={currentGameweek}
          />
        )}

        {/* My Team Modal */}
        {showMyTeam && myTeam && (
          <MyTeam
            myTeam={myTeam}
            isLive={isLive}
            onClose={() => setShowMyTeam(false)}
            onClearTeam={handleClearTeam}
          />
        )}

        {/* Main Content */}
        <main className="main">
          {displayData.type === 'top' ? (
            // Top Players View
            <>
              {['GKP', 'DEF', 'MID', 'FWD'].map(position => {
                const sortOptions = getSortOptions(isLive, data?.currentGameweek);
                const allOptions = [...sortOptions.left, ...sortOptions.right];
                const currentSort = allOptions.find(opt => opt.value === sortBy);
                return (
                <section key={position} className="position-section">
                  <h2 className="position-title">
                    <span className="position-title__text">{POSITION_NAMES[position]}</span>
                    <span className="position-title__separator">//</span>
                    <span className="position-title__filter">{currentSort?.label}</span>
                    <span className="position-title__badge">TOP 10</span>
                  </h2>
                  <div className="player-scroll">
                    {displayData.playersByPosition[position]?.map((player, index) => (
                      <PlayerCard key={player.id} player={player} index={index} showTeam isLive={isLive} />
                    ))}
                  </div>
                </section>
              );
              })}
            </>
          ) : (
            // Team View
            <>
              {displayData.team && (
                <div className="team-banner">
                  <img
                    src={`https://resources.premierleague.com/premierleague/badges/rb/t${displayData.team.code}.svg`}
                    alt={displayData.team.name}
                    className="team-banner__badge"
                  />
                  <div className="team-banner__info">
                    <h2 className="team-banner__name">{displayData.team.name}</h2>
                    <div className="team-banner__stats">
                      <span>Strength: {displayData.team.strength}</span>
                      <span>Attack: {displayData.team.attackHome}/{displayData.team.attackAway}</span>
                      <span>Defence: {displayData.team.defenceHome}/{displayData.team.defenceAway}</span>
                    </div>
                  </div>
                </div>
              )}

              {['GKP', 'DEF', 'MID', 'FWD'].map(position => {
                const posPlayers = displayData.players.filter(p => p.position === position);
                if (!posPlayers.length) return null;

                return (
                  <section key={position} className="position-section">
                    <h2 className="position-title">
                      <span className="position-title__text">{POSITION_NAMES[position]}</span>
                      <span className="position-title__count">{posPlayers.length}</span>
                    </h2>
                    <div className="player-grid">
                      {posPlayers.map((player, index) => (
                        <PlayerCard key={player.id} player={player} index={index} isLive={isLive} />
                      ))}
                    </div>
                  </section>
                );
              })}
            </>
          )}
        </main>

        {/* Footer */}
        <footer className="footer">
          <div className="footer__credit">
            <a
              href="https://crbntyp.com"
              className="footer__logo"
              target="_blank"
              rel="noopener noreferrer"
            >
              crbntyp
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default App;
