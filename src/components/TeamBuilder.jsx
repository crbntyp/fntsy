import { useState, useEffect, useMemo, useRef } from 'react';
import html2canvas from 'html2canvas';
import PlayerCard from './PlayerCard';
import Dropdown from './Dropdown';
import { addPredictions } from '../hooks/useFPLData';
import './TeamBuilder.css';

const STORAGE_KEY = 'fntsy_builder_teams';
const BUDGET = 100; // £100.0m
const MAX_PER_TEAM = 3;

const POSITION_LIMITS = {
  GKP: { min: 2, max: 2 },
  DEF: { min: 5, max: 5 },
  MID: { min: 5, max: 5 },
  FWD: { min: 3, max: 3 }
};

const EMPTY_TEAM = {
  id: null,
  name: 'My Team',
  createdGW: null,
  players: [],
  starting: [],
  bench: [],
  captain: null,
  viceCaptain: null,
  pointsHistory: {} // { gw: points }
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export default function TeamBuilder({ players, teams, currentGameweek, allFixtures, onBack }) {
  // Add predictions to players
  const playersWithPredictions = useMemo(() => {
    if (!players?.length || !allFixtures?.length) return players || [];
    return addPredictions(players, allFixtures, currentGameweek);
  }, [players, allFixtures, currentGameweek]);
  // All saved teams
  const [savedTeams, setSavedTeams] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  });

  // Current team being edited
  const [currentTeam, setCurrentTeam] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const teams = stored ? JSON.parse(stored) : [];
    return teams[0] || { ...EMPTY_TEAM, id: generateId(), createdGW: currentGameweek };
  });

  // UI state - auto-open picker on desktop
  const [showPlayerPicker, setShowPlayerPicker] = useState(() => window.innerWidth >= 900);
  const [pickerPosition, setPickerPosition] = useState('GKP');
  const [pickerSlotIndex, setPickerSlotIndex] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTeam, setFilterTeam] = useState(null);
  const [sortBy, setSortBy] = useState('predicted');
  const [showTeamList, setShowTeamList] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [exporting, setExporting] = useState(false);

  // Ref for pitch export
  const pitchRef = useRef(null);

  // Save to localStorage whenever savedTeams changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedTeams));
  }, [savedTeams]);

  // Get players in current team
  const teamPlayers = useMemo(() => {
    return currentTeam.players.map(id => playersWithPredictions.find(p => p.id === id)).filter(Boolean);
  }, [currentTeam.players, playersWithPredictions]);

  // Calculate budget spent
  const budgetSpent = useMemo(() => {
    return teamPlayers.reduce((sum, p) => sum + p.price, 0);
  }, [teamPlayers]);

  const budgetRemaining = BUDGET - budgetSpent;

  // Count players per position
  const positionCounts = useMemo(() => {
    const counts = { GKP: 0, DEF: 0, MID: 0, FWD: 0 };
    teamPlayers.forEach(p => {
      if (counts[p.position] !== undefined) counts[p.position]++;
    });
    return counts;
  }, [teamPlayers]);

  // Count players per club
  const clubCounts = useMemo(() => {
    const counts = {};
    teamPlayers.forEach(p => {
      counts[p.teamId] = (counts[p.teamId] || 0) + 1;
    });
    return counts;
  }, [teamPlayers]);

  // Calculate current GW points (all 15 players, captain 2x)
  const currentGWPoints = useMemo(() => {
    if (teamPlayers.length === 0) return 0;
    return teamPlayers.reduce((sum, p) => {
      const pts = p.livePoints || 0;
      if (p.id === currentTeam.captain) return sum + (pts * 2);
      return sum + pts;
    }, 0);
  }, [teamPlayers, currentTeam.captain]);

  // Calculate total points from history
  const totalPoints = useMemo(() => {
    const history = currentTeam.pointsHistory || {};
    return Object.values(history).reduce((sum, pts) => sum + pts, 0);
  }, [currentTeam.pointsHistory]);

  // Calculate predicted points for team (captain 2x)
  const predictedTeamPoints = useMemo(() => {
    if (teamPlayers.length === 0) return 0;
    return teamPlayers.reduce((sum, p) => {
      const pts = p.predictedPoints || 0;
      if (p.id === currentTeam.captain) return sum + (pts * 2);
      return sum + pts;
    }, 0);
  }, [teamPlayers, currentTeam.captain]);

  // Get players by position for pitch display
  const getPlayersInPosition = (position) => {
    return teamPlayers.filter(p => p.position === position);
  };

  // Check if player can be added
  const canAddPlayer = (player) => {
    if (currentTeam.players.includes(player.id)) return false;
    if (currentTeam.players.length >= 15) return false;
    if (player.price > budgetRemaining) return false;
    if (positionCounts[player.position] >= POSITION_LIMITS[player.position].max) return false;
    if ((clubCounts[player.teamId] || 0) >= MAX_PER_TEAM) return false;
    return true;
  };

  // Check if desktop width for side panel layout
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 900);
  useEffect(() => {
    const handleResize = () => {
      const nowDesktop = window.innerWidth >= 900;
      setIsDesktop(nowDesktop);
      // Close picker when switching to mobile, open when switching to desktop
      setShowPlayerPicker(nowDesktop);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Open player picker for a position
  const openPicker = (position, slotIndex = null) => {
    setPickerPosition(position);
    setPickerSlotIndex(slotIndex);
    setShowPlayerPicker(true);
    setSearchQuery('');
    setFilterTeam(null);
  };

  // Add player to team
  const addPlayer = (player) => {
    if (!canAddPlayer(player)) return;

    setCurrentTeam(prev => ({
      ...prev,
      players: [...prev.players, player.id]
    }));
    // Only close picker on mobile
    if (!isDesktop) {
      setShowPlayerPicker(false);
    }
  };

  // Remove player from team
  const removePlayer = (playerId) => {
    setCurrentTeam(prev => ({
      ...prev,
      players: prev.players.filter(id => id !== playerId),
      starting: prev.starting.filter(id => id !== playerId),
      bench: prev.bench.filter(id => id !== playerId),
      captain: prev.captain === playerId ? null : prev.captain,
      viceCaptain: prev.viceCaptain === playerId ? null : prev.viceCaptain
    }));
  };

  // Set captain
  const setCaptain = (playerId) => {
    setCurrentTeam(prev => ({
      ...prev,
      captain: playerId,
      viceCaptain: prev.viceCaptain === playerId ? null : prev.viceCaptain
    }));
  };

  // Set vice captain
  const setViceCaptain = (playerId) => {
    setCurrentTeam(prev => ({
      ...prev,
      viceCaptain: playerId,
      captain: prev.captain === playerId ? null : prev.captain
    }));
  };

  // Save current team (and record current GW points)
  const saveTeam = () => {
    // Update points history for current GW
    const updatedHistory = {
      ...(currentTeam.pointsHistory || {}),
      [currentGameweek]: currentGWPoints
    };

    const teamToSave = {
      ...currentTeam,
      createdGW: currentTeam.createdGW || currentGameweek,
      pointsHistory: updatedHistory
    };

    setCurrentTeam(teamToSave);

    setSavedTeams(prev => {
      const existing = prev.findIndex(t => t.id === currentTeam.id);
      if (existing >= 0) {
        const updated = [...prev];
        updated[existing] = teamToSave;
        return updated;
      }
      return [...prev, teamToSave];
    });
  };

  // Export team as PNG
  const exportTeam = async () => {
    if (!pitchRef.current || exporting) return;

    setExporting(true);
    try {
      // Convert all images to base64 to avoid CORS issues
      const images = pitchRef.current.querySelectorAll('img');
      const originalSrcs = [];

      await Promise.all([...images].map(async (img, i) => {
        originalSrcs[i] = img.src;
        try {
          const response = await fetch(img.src, { mode: 'cors' });
          const blob = await response.blob();
          const base64 = await new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(blob);
          });
          img.src = base64;
        } catch (e) {
          // If fetch fails, try proxy
          try {
            const proxyUrl = `/fntsy/proxy.php?image=${encodeURIComponent(img.src)}`;
            const response = await fetch(proxyUrl);
            const blob = await response.blob();
            const base64 = await new Promise((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result);
              reader.readAsDataURL(blob);
            });
            img.src = base64;
          } catch (e2) {
            console.log('Could not convert image:', img.src);
          }
        }
      }));

      const canvas = await html2canvas(pitchRef.current, {
        backgroundColor: '#0a0a0a',
        scale: 2,
        useCORS: true,
        allowTaint: true,
        logging: false
      });

      // Restore original image sources
      images.forEach((img, i) => {
        img.src = originalSrcs[i];
      });

      const link = document.createElement('a');
      link.download = `${currentTeam.name.replace(/\s+/g, '-').toLowerCase()}-gw${currentGameweek}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  // Create new team
  const createNewTeam = () => {
    const newTeam = { ...EMPTY_TEAM, id: generateId(), createdGW: currentGameweek };
    setCurrentTeam(newTeam);
    setShowTeamList(false);
  };

  // Load team
  const loadTeam = (team) => {
    setCurrentTeam(team);
    setShowTeamList(false);
  };

  // Delete team
  const deleteTeam = (teamId) => {
    setSavedTeams(prev => prev.filter(t => t.id !== teamId));
    if (currentTeam.id === teamId) {
      const remaining = savedTeams.filter(t => t.id !== teamId);
      if (remaining.length > 0) {
        setCurrentTeam(remaining[0]);
      } else {
        createNewTeam();
      }
    }
  };

  // Filter players for picker
  const filteredPlayers = useMemo(() => {
    let filtered = playersWithPredictions;

    // Filter by position
    if (pickerPosition) {
      filtered = filtered.filter(p => p.position === pickerPosition);
    }

    // Filter by team
    if (filterTeam) {
      filtered = filtered.filter(p => p.teamId === filterTeam);
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.teamShortName?.toLowerCase().includes(query)
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'price') return b.price - a.price;
      if (sortBy === 'totalPoints') return b.totalPoints - a.totalPoints;
      if (sortBy === 'selectedBy') return b.selectedBy - a.selectedBy;
      if (sortBy === 'predicted') return (b.predictedPoints || 0) - (a.predictedPoints || 0);
      return 0;
    });

    return filtered;
  }, [playersWithPredictions, pickerPosition, filterTeam, searchQuery, sortBy]);

  // Render empty slot
  const renderSlot = (position, index) => {
    const playersInPos = getPlayersInPosition(position);
    const player = playersInPos[index];

    if (player) {
      return (
        <div key={`${position}-${index}`} className="builder-pitch__player">
          {currentTeam.captain === player.id && (
            <span className="builder-pitch__badge builder-pitch__badge--captain">C</span>
          )}
          {currentTeam.viceCaptain === player.id && (
            <span className="builder-pitch__badge builder-pitch__badge--vice">V</span>
          )}
          <PlayerCard player={player} compact />
          <div className="builder-pitch__actions">
            <button onClick={() => setCaptain(player.id)} title="Captain">C</button>
            <button onClick={() => setViceCaptain(player.id)} title="Vice">V</button>
            <button onClick={() => removePlayer(player.id)} title="Remove">×</button>
          </div>
        </div>
      );
    }

    return (
      <button
        key={`${position}-${index}`}
        className="builder-pitch__slot"
        onClick={() => openPicker(position, index)}
      >
        <span className="builder-pitch__slot-icon">+</span>
        <span className="builder-pitch__slot-pos">{position}</span>
      </button>
    );
  };

  // Calculate formation string
  const formation = `${positionCounts.DEF}-${positionCounts.MID}-${positionCounts.FWD}`;

  // Picker content (used in both modal and side panel)
  const pickerContent = (
    <>
      <div className="picker-header">
        <h2>Select {pickerPosition || 'Player'}</h2>
        {!isDesktop && (
          <button className="picker-close" onClick={() => setShowPlayerPicker(false)}>×</button>
        )}
      </div>

      <div className="picker-filters">
        <input
          type="text"
          className="picker-search"
          placeholder="Search players..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <div className="picker-filters__row">
          <Dropdown
            fullWidth
            value={filterTeam || ''}
            options={[
              { value: '', label: 'All Teams' },
              ...teams.map(t => ({
                value: t.id,
                label: t.name,
                icon: `https://resources.premierleague.com/premierleague/badges/50/t${t.code}@x2.png`
              }))
            ]}
            onChange={(val) => setFilterTeam(val ? Number(val) : null)}
          />
          <Dropdown
            fullWidth
            value={sortBy}
            options={[
              { value: 'predicted', label: 'Predicted' },
              { value: 'totalPoints', label: 'Points' },
              { value: 'price', label: 'Price' },
              { value: 'selectedBy', label: 'Ownership' }
            ]}
            onChange={setSortBy}
          />
        </div>
      </div>

      {/* Position tabs for desktop side panel */}
      {isDesktop && (
        <div className="picker-positions">
          {['GKP', 'DEF', 'MID', 'FWD'].map(pos => (
            <button
              key={pos}
              className={`picker-positions__btn ${pickerPosition === pos ? 'active' : ''}`}
              onClick={() => setPickerPosition(pos)}
            >
              {pos}
              <span className="picker-positions__count">
                {positionCounts[pos]}/{POSITION_LIMITS[pos].max}
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="picker-list">
        {filteredPlayers.map(player => {
          const canAdd = canAddPlayer(player);
          const inTeam = currentTeam.players.includes(player.id);
          const clubFull = (clubCounts[player.teamId] || 0) >= MAX_PER_TEAM;

          return (
            <button
              key={player.id}
              className={`picker-player ${!canAdd ? 'disabled' : ''} ${inTeam ? 'in-team' : ''}`}
              onClick={() => canAdd && addPlayer(player)}
              disabled={!canAdd}
            >
              <img
                src={player.photoUrls?.[0]}
                alt=""
                className="picker-player__photo"
                data-photo-index="0"
                onError={(e) => {
                  const urls = player.photoUrls || [];
                  const currentIndex = parseInt(e.target.dataset.photoIndex || '0', 10);
                  const nextIndex = currentIndex + 1;
                  if (nextIndex < urls.length) {
                    e.target.dataset.photoIndex = nextIndex;
                    e.target.src = urls[nextIndex];
                  }
                }}
              />
              <div className="picker-player__info">
                <span className="picker-player__club">{player.team?.name}</span>
                <span className="picker-player__name">{player.webName}</span>
                <span className="picker-player__fixture">
                  {player.nextOpponent && (
                    <>vs {player.nextOpponent.name}{!player.nextIsHome && ' (A)'}</>
                  )}
                </span>
              </div>
              <div className="picker-player__stats">
                <span className="picker-player__predicted">{player.predictedPoints || '-'}</span>
                <span className="picker-player__price">£{player.price.toFixed(1)}m</span>
              </div>
              {inTeam && <span className="picker-player__tag">In Team</span>}
              {!inTeam && clubFull && <span className="picker-player__tag">Club Full</span>}
            </button>
          );
        })}
      </div>
    </>
  );

  return (
    <div className={`team-builder ${isDesktop && showPlayerPicker ? 'team-builder--with-panel' : ''}`}>
      <div className="builder-main">
      {/* Header */}
      <div className="builder-header">
        <div className="builder-header__info">
          {editingName ? (
            <input
              type="text"
              className="builder-header__name-input"
              value={currentTeam.name}
              onChange={(e) => setCurrentTeam(prev => ({ ...prev, name: e.target.value }))}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
              autoFocus
            />
          ) : (
            <h1 className="builder-header__name" onClick={() => setEditingName(true)}>
              {currentTeam.name}
            </h1>
          )}
          <span className="builder-header__gw">GW{currentGameweek}</span>
        </div>
        <div className="builder-header__points">
          <div className="builder-header__stat">
            <span className="builder-header__stat-value">{currentGWPoints}</span>
            <span className="builder-header__stat-label">GW{currentGameweek}</span>
          </div>
          <div className="builder-header__stat builder-header__stat--predicted">
            <span className="builder-header__stat-value">{predictedTeamPoints.toFixed(1)}</span>
            <span className="builder-header__stat-label">Predicted</span>
          </div>
          <div className="builder-header__stat">
            <span className="builder-header__stat-value">{totalPoints}</span>
            <span className="builder-header__stat-label">Total</span>
          </div>
        </div>
        <div className="builder-header__actions">
          <button className="builder-header__btn" onClick={() => setShowTeamList(true)}>
            Teams
          </button>
          <button className="builder-header__btn" onClick={exportTeam} disabled={exporting}>
            {exporting ? '...' : 'Export'}
          </button>
          <button className="builder-header__btn builder-header__btn--primary" onClick={saveTeam}>
            Save
          </button>
        </div>
      </div>

      {/* Budget bar */}
      <div className="builder-budget">
        <div className="builder-budget__bar">
          <div
            className="builder-budget__fill"
            style={{ width: `${(budgetSpent / BUDGET) * 100}%` }}
          />
        </div>
        <div className="builder-budget__info">
          <span className="builder-budget__spent">£{budgetSpent.toFixed(1)}m</span>
          <span className="builder-budget__remaining">£{budgetRemaining.toFixed(1)}m remaining</span>
        </div>
      </div>

      {/* Squad count */}
      <div className="builder-squad-count">
        <span className={positionCounts.GKP === 2 ? 'complete' : ''}>GK: {positionCounts.GKP}/2</span>
        <span className={positionCounts.DEF === 5 ? 'complete' : ''}>DEF: {positionCounts.DEF}/5</span>
        <span className={positionCounts.MID === 5 ? 'complete' : ''}>MID: {positionCounts.MID}/5</span>
        <span className={positionCounts.FWD === 3 ? 'complete' : ''}>FWD: {positionCounts.FWD}/3</span>
        <span className={currentTeam.players.length === 15 ? 'complete' : ''}>
          Total: {currentTeam.players.length}/15
        </span>
      </div>

      {/* Pitch */}
      <div className="builder-pitch" ref={pitchRef}>
        <span className="builder-pitch__formation">{formation}</span>

        <div className="builder-pitch__markings">
          <div className="builder-pitch__center-circle" />
          <div className="builder-pitch__penalty-box" />
          <div className="builder-pitch__goal-box" />
        </div>

        <div className="builder-pitch__row builder-pitch__row--fwd">
          {[0, 1, 2].map(i => renderSlot('FWD', i))}
        </div>

        <div className="builder-pitch__row builder-pitch__row--mid">
          {[0, 1, 2, 3, 4].map(i => renderSlot('MID', i))}
        </div>

        <div className="builder-pitch__row builder-pitch__row--def">
          {[0, 1, 2, 3, 4].map(i => renderSlot('DEF', i))}
        </div>

        <div className="builder-pitch__row builder-pitch__row--gkp">
          {[0, 1].map(i => renderSlot('GKP', i))}
        </div>
      </div>

      </div>{/* end builder-main */}

      {/* Desktop Side Panel */}
      {isDesktop && showPlayerPicker && (
        <div className="picker-panel">
          {pickerContent}
        </div>
      )}

      {/* Mobile Modal */}
      {!isDesktop && showPlayerPicker && (
        <div className="picker-overlay" onClick={() => setShowPlayerPicker(false)}>
          <div className="picker-modal" onClick={e => e.stopPropagation()}>
            {pickerContent}
          </div>
        </div>
      )}

      {/* Team List Modal */}
      {showTeamList && (
        <div className="picker-overlay" onClick={() => setShowTeamList(false)}>
          <div className="picker-modal picker-modal--narrow" onClick={e => e.stopPropagation()}>
            <div className="picker-header">
              <h2>Your Teams</h2>
              <button className="picker-close" onClick={() => setShowTeamList(false)}>×</button>
            </div>

            <div className="team-list">
              {savedTeams.map(team => (
                <button
                  key={team.id}
                  className={`team-list__item ${team.id === currentTeam.id ? 'active' : ''}`}
                  onClick={() => loadTeam(team)}
                >
                  <div className="team-list__info">
                    <span className="team-list__name">{team.name}</span>
                    <span className="team-list__meta">
                      {team.players.length}/15 players
                      {team.pointsHistory && Object.keys(team.pointsHistory).length > 0 && (
                        <> · {Object.values(team.pointsHistory).reduce((a, b) => a + b, 0)} pts</>
                      )}
                    </span>
                  </div>
                  <span
                    className="team-list__delete"
                    onClick={(e) => { e.stopPropagation(); deleteTeam(team.id); }}
                  >
                    ×
                  </span>
                </button>
              ))}
              {savedTeams.length === 0 && (
                <p className="team-list__empty">No saved teams yet</p>
              )}
            </div>

            <button className="team-list__new" onClick={createNewTeam}>
              + Create New Team
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
