import { useState, useMemo, useEffect } from 'react';
import { useFPLData, useMyTeam, getTopPlayersByPosition, getPlayersByTeam, getTeamUpcoming } from './hooks/useFPLData';
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
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);
  const [teamDropdownOpen, setTeamDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Handle team selection with URL hash
  const selectTeam = (team) => {
    setViewMode('team');
    setSelectedTeamId(team.id);
    window.location.hash = team.shortName.toLowerCase();
  };

  // Handle back to top view
  const handleBackToTop = () => {
    setViewMode('top');
    setSelectedTeamId(null);
    window.location.hash = '';
  };

  // Handle URL hash on load and hash change
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.slice(1).toLowerCase();
      if (hash && data?.teams) {
        const team = data.teams.find(t => t.shortName.toLowerCase() === hash);
        if (team) {
          setViewMode('team');
          setSelectedTeamId(team.id);
        }
      } else if (!hash) {
        setViewMode('top');
        setSelectedTeamId(null);
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [data?.teams]);

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
      const nextFixtures = getTeamUpcoming(data.allFixtures, teamId, 1);
      return {
        type: 'team',
        team,
        players: getPlayersByTeam(data.players, teamId),
        nextFixture: nextFixtures[0] || null
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
                onClick={() => selectTeam(team)}
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
        <div className={`controls ${viewMode === 'team' ? 'controls--team-view' : ''}`}>
            <div className="controls__left">
              {/* Sort buttons - left group (desktop, only on top view) */}
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

              {/* Mobile dropdowns container */}
              <div className="controls__mobile-dropdowns">
                {/* Filter Dropdown - mobile (only on top view) */}
                {viewMode === 'top' && (
                  <div className="filter-dropdown">
                    <button
                      className="filter-dropdown__trigger"
                      onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
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

                {/* Team Dropdown - mobile */}
                <div className="team-dropdown team-dropdown--mobile">
                  <button
                    className="team-dropdown__trigger"
                    onClick={() => setTeamDropdownOpen(!teamDropdownOpen)}
                  >
                    {viewMode === 'team' && selectedTeamId ? (
                      <>
                        <img
                          src={`https://resources.premierleague.com/premierleague/badges/100/t${teams.find(t => t.id === selectedTeamId)?.code}@x2.png`}
                          alt=""
                          className="team-dropdown__current-badge"
                        />
                        <span>{teams.find(t => t.id === selectedTeamId)?.name}</span>
                      </>
                    ) : (
                      <span>Teams</span>
                    )}
                    <svg className="team-dropdown__arrow" width="10" height="10" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M8 11L3 6h10l-5 5z" />
                    </svg>
                  </button>
                  {teamDropdownOpen && (
                    <div className="team-dropdown__menu">
                      {teams.map(team => (
                        <button
                          key={team.id}
                          className={`team-dropdown__item ${selectedTeamId === team.id ? 'active' : ''}`}
                          onClick={() => {
                            selectTeam(team);
                            setTeamDropdownOpen(false);
                          }}
                        >
                          <img
                            src={`https://resources.premierleague.com/premierleague/badges/100/t${team.code}@x2.png`}
                            alt={team.name}
                            className="team-dropdown__badge"
                          />
                          <span>{team.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
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

              {/* Sort buttons - right group (desktop, only on top view) */}
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

        {/* Top right buttons - desktop */}
        <div className="top-right-btns top-right-btns--desktop">
          {viewMode !== 'top' && (
            <button
              className="back-btn"
              onClick={handleBackToTop}
            >
              ← Back
            </button>
          )}
          <button
            className="myteam-btn"
            onClick={handleMyTeamClick}
          >
            {myTeamLoading ? 'Loading...' : 'My Team'}
          </button>
        </div>

        {/* Burger menu - mobile */}
        <div className="burger-menu">
          <button
            className={`burger-menu__toggle ${mobileMenuOpen ? 'open' : ''}`}
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
          {mobileMenuOpen && (
            <div className="burger-menu__dropdown">
              {viewMode !== 'top' && (
                <button
                  className="burger-menu__item"
                  onClick={() => {
                    handleBackToTop();
                    setMobileMenuOpen(false);
                  }}
                >
                  ← Back to Top
                </button>
              )}
              <button
                className="burger-menu__item"
                onClick={() => {
                  handleMyTeamClick();
                  setMobileMenuOpen(false);
                }}
              >
                {myTeamLoading ? 'Loading...' : 'My Team'}
              </button>
            </div>
          )}
        </div>

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
                  <div className="team-banner__left">
                    <img
                      src={`https://resources.premierleague.com/premierleague/badges/100/t${displayData.team.code}@x2.png`}
                      alt={displayData.team.name}
                      className="team-banner__badge"
                    />
                    <div className="team-banner__info">
                      <h2 className="team-banner__name">{displayData.team.name}</h2>
                      {displayData.team.stadium && (
                        <span className="team-banner__stadium">{displayData.team.stadium}</span>
                      )}
                      {displayData.team.capacity && (
                        <span className="team-banner__capacity">{displayData.team.capacity.toLocaleString()}</span>
                      )}
                      {displayData.team.manager && (
                        <span
                          className="team-banner__manager"
                          style={{ color: displayData.team.kitColors?.primary }}
                        >
                          {displayData.team.manager}
                        </span>
                      )}
                    </div>
                  </div>
                  {displayData.nextFixture && (
                    <div className="team-banner__next">
                      <span className="team-banner__next-label">Next</span>
                      <div className="team-banner__next-fixture">
                        {displayData.nextFixture.homeTeam.id === displayData.team.id ? (
                          <>
                            <span className="team-banner__next-venue">H</span>
                            <img
                              src={`https://resources.premierleague.com/premierleague/badges/100/t${displayData.nextFixture.awayTeam.code}@x2.png`}
                              alt={displayData.nextFixture.awayTeam.shortName}
                              className="team-banner__next-badge"
                            />
                            <span className="team-banner__next-opponent">{displayData.nextFixture.awayTeam.shortName}</span>
                          </>
                        ) : (
                          <>
                            <span className="team-banner__next-venue">A</span>
                            <img
                              src={`https://resources.premierleague.com/premierleague/badges/100/t${displayData.nextFixture.homeTeam.code}@x2.png`}
                              alt={displayData.nextFixture.homeTeam.shortName}
                              className="team-banner__next-badge"
                            />
                            <span className="team-banner__next-opponent">{displayData.nextFixture.homeTeam.shortName}</span>
                          </>
                        )}
                      </div>
                      <span className="team-banner__next-date">
                        {new Date(displayData.nextFixture.kickoffTime).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  )}
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
