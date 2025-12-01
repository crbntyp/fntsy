import { useState, useEffect, useMemo, useRef } from 'react';
import domtoimage from 'dom-to-image-more';
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

const FORMATIONS = [
  { value: '3-4-3', def: 3, mid: 4, fwd: 3 },
  { value: '3-5-2', def: 3, mid: 5, fwd: 2 },
  { value: '4-3-3', def: 4, mid: 3, fwd: 3 },
  { value: '4-4-2', def: 4, mid: 4, fwd: 2 },
  { value: '4-5-1', def: 4, mid: 5, fwd: 1 },
  { value: '5-3-2', def: 5, mid: 3, fwd: 2 },
  { value: '5-4-1', def: 5, mid: 4, fwd: 1 }
];

const EMPTY_TEAM = {
  id: null,
  name: 'My Team',
  createdGW: null,
  players: [],
  formation: '4-3-3',
  starting: [], // 11 player IDs
  bench: [], // 4 player IDs in order
  captain: null,
  viceCaptain: null,
  pointsHistory: {} // { gw: points }
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// Auto-assign starting 11 based on formation and predicted points
function autoAssignStarting(players, formation) {
  if (players.length === 0) return { starting: [], bench: [] };

  const formationConfig = FORMATIONS.find(f => f.value === formation) || FORMATIONS[0];

  // Group by position and sort by predicted points
  const byPosition = { GKP: [], DEF: [], MID: [], FWD: [] };
  players.forEach(p => {
    if (byPosition[p.position]) {
      byPosition[p.position].push(p);
    }
  });

  // Sort each position by predicted points (desc)
  Object.keys(byPosition).forEach(pos => {
    byPosition[pos].sort((a, b) => (b.predictedPoints || 0) - (a.predictedPoints || 0));
  });

  // Pick starters based on formation
  const starting = [];
  const bench = [];

  // 1 GK starts
  if (byPosition.GKP[0]) starting.push(byPosition.GKP[0].id);
  if (byPosition.GKP[1]) bench.push(byPosition.GKP[1].id);

  // DEF based on formation
  byPosition.DEF.forEach((p, i) => {
    if (i < formationConfig.def) starting.push(p.id);
    else bench.push(p.id);
  });

  // MID based on formation
  byPosition.MID.forEach((p, i) => {
    if (i < formationConfig.mid) starting.push(p.id);
    else bench.push(p.id);
  });

  // FWD based on formation
  byPosition.FWD.forEach((p, i) => {
    if (i < formationConfig.fwd) starting.push(p.id);
    else bench.push(p.id);
  });

  return { starting, bench };
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
  const [addingToBench, setAddingToBench] = useState(false);
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

  // Get current formation config
  const formationConfig = useMemo(() => {
    return FORMATIONS.find(f => f.value === (currentTeam.formation || '3-4-3')) || FORMATIONS[0];
  }, [currentTeam.formation]);

  // Get starting 11 and bench 4 players
  const { startingPlayers, benchPlayers } = useMemo(() => {
    // If we have manual starting/bench assignments, use them
    if (currentTeam.starting?.length > 0) {
      const starting = currentTeam.starting.map(id => teamPlayers.find(p => p.id === id)).filter(Boolean);
      const bench = currentTeam.bench?.map(id => teamPlayers.find(p => p.id === id)).filter(Boolean) || [];
      return { startingPlayers: starting, benchPlayers: bench };
    }
    // Otherwise auto-assign based on formation
    const { starting, bench } = autoAssignStarting(teamPlayers, currentTeam.formation || '3-4-3');
    return {
      startingPlayers: starting.map(id => teamPlayers.find(p => p.id === id)).filter(Boolean),
      benchPlayers: bench.map(id => teamPlayers.find(p => p.id === id)).filter(Boolean)
    };
  }, [teamPlayers, currentTeam.starting, currentTeam.bench, currentTeam.formation]);

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

  // Count starting players per position (for formation display)
  const startingCounts = useMemo(() => {
    const counts = { GKP: 0, DEF: 0, MID: 0, FWD: 0 };
    startingPlayers.forEach(p => {
      if (counts[p.position] !== undefined) counts[p.position]++;
    });
    return counts;
  }, [startingPlayers]);

  // Count players per club
  const clubCounts = useMemo(() => {
    const counts = {};
    teamPlayers.forEach(p => {
      counts[p.teamId] = (counts[p.teamId] || 0) + 1;
    });
    return counts;
  }, [teamPlayers]);

  // Calculate current GW points (starting 11 only, captain 2x)
  const currentGWPoints = useMemo(() => {
    if (startingPlayers.length === 0) return 0;
    return startingPlayers.reduce((sum, p) => {
      const pts = p.livePoints || 0;
      if (p.id === currentTeam.captain) return sum + (pts * 2);
      return sum + pts;
    }, 0);
  }, [startingPlayers, currentTeam.captain]);

  // Calculate total points from history
  const totalPoints = useMemo(() => {
    const history = currentTeam.pointsHistory || {};
    return Object.values(history).reduce((sum, pts) => sum + pts, 0);
  }, [currentTeam.pointsHistory]);

  // Calculate predicted points for team (starting 11, captain 2x)
  const predictedTeamPoints = useMemo(() => {
    if (startingPlayers.length === 0) return 0;
    return startingPlayers.reduce((sum, p) => {
      const pts = p.predictedPoints || 0;
      if (p.id === currentTeam.captain) return sum + (pts * 2);
      return sum + pts;
    }, 0);
  }, [startingPlayers, currentTeam.captain]);

  // Get starting players by position for pitch display
  const getPlayersInPosition = (position) => {
    return startingPlayers.filter(p => p.position === position);
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

  // Get current starting/bench IDs (from state or auto-assigned)
  const getCurrentLineup = () => {
    if (currentTeam.starting?.length > 0) {
      return {
        startingIds: currentTeam.starting,
        benchIds: currentTeam.bench || []
      };
    }
    // Use auto-assigned
    const { starting, bench } = autoAssignStarting(teamPlayers, currentTeam.formation || '3-4-3');
    return { startingIds: starting, benchIds: bench };
  };

  // Open player picker for a position
  const openPicker = (position, slotIndex = null, forBench = false) => {
    setPickerPosition(position);
    setPickerSlotIndex(slotIndex);
    setAddingToBench(forBench);
    setShowPlayerPicker(true);
    setSearchQuery('');
    setFilterTeam(null);
  };

  // Open picker for bench slot (all positions)
  const openBenchPicker = () => {
    setPickerPosition(null); // null = all positions
    setPickerSlotIndex(null);
    setAddingToBench(true);
    setShowPlayerPicker(true);
    setSearchQuery('');
    setFilterTeam(null);
  };

  // Add player to team
  const addPlayer = (player) => {
    if (!canAddPlayer(player)) return;

    // Before 15 players, just add to team (no starting/bench distinction)
    if (currentTeam.players.length < 14) {
      setCurrentTeam(prev => ({
        ...prev,
        players: [...prev.players, player.id]
      }));
    } else {
      // Adding the 15th player - auto-assign formation
      const newPlayers = [...currentTeam.players, player.id];
      const allPlayers = newPlayers.map(id => playersWithPredictions.find(p => p.id === id)).filter(Boolean);
      const { starting, bench } = autoAssignStarting(allPlayers, currentTeam.formation || '3-4-3');
      setCurrentTeam(prev => ({
        ...prev,
        players: newPlayers,
        starting,
        bench
      }));
    }
    // Only close picker on mobile
    if (!isDesktop) {
      setShowPlayerPicker(false);
    }
  };

  // Remove player from team
  const removePlayer = (playerId) => {
    const newPlayers = currentTeam.players.filter(id => id !== playerId);
    // If dropping below 15 players, clear starting/bench
    if (newPlayers.length < 15) {
      setCurrentTeam(prev => ({
        ...prev,
        players: newPlayers,
        starting: [],
        bench: [],
        captain: prev.captain === playerId ? null : prev.captain,
        viceCaptain: prev.viceCaptain === playerId ? null : prev.viceCaptain
      }));
    } else {
      setCurrentTeam(prev => ({
        ...prev,
        players: newPlayers,
        starting: prev.starting.filter(id => id !== playerId),
        bench: prev.bench.filter(id => id !== playerId),
        captain: prev.captain === playerId ? null : prev.captain,
        viceCaptain: prev.viceCaptain === playerId ? null : prev.viceCaptain
      }));
    }
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

  // Change formation and re-assign starting/bench
  const changeFormation = (newFormation) => {
    const { starting, bench } = autoAssignStarting(teamPlayers, newFormation);
    setCurrentTeam(prev => ({
      ...prev,
      formation: newFormation,
      starting,
      bench
    }));
  };

  // Drag and drop state
  const [draggedPlayer, setDraggedPlayer] = useState(null);

  // Validate if a formation change is allowed
  const validateFormation = (newCounts) => {
    // GKP: exactly 1
    if (newCounts.GKP !== 1) return false;
    // DEF: 3-5
    if (newCounts.DEF < 3 || newCounts.DEF > 5) return false;
    // MID: 3-5
    if (newCounts.MID < 3 || newCounts.MID > 5) return false;
    // FWD: 1-3
    if (newCounts.FWD < 1 || newCounts.FWD > 3) return false;
    // Total must be 11
    const total = newCounts.GKP + newCounts.DEF + newCounts.MID + newCounts.FWD;
    if (total !== 11) return false;
    return true;
  };

  // Handle drag start
  const handleDragStart = (e, player, isFromBench) => {
    setDraggedPlayer({ ...player, isFromBench });
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle drag over (allow drop)
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle drop on a starting position (swap bench player with starter)
  const handleDropOnStarter = (e, targetPlayer) => {
    e.preventDefault();
    if (!draggedPlayer || !draggedPlayer.isFromBench) {
      setDraggedPlayer(null);
      return;
    }

    // Calculate new formation counts
    const newCounts = { ...startingCounts };
    newCounts[targetPlayer.position]--; // Remove target from starting
    newCounts[draggedPlayer.position]++; // Add dragged to starting

    if (!validateFormation(newCounts)) {
      setDraggedPlayer(null);
      return;
    }

    // Get current lineup IDs
    const { startingIds, benchIds } = getCurrentLineup();

    // Calculate new formation string
    const newFormation = `${newCounts.DEF}-${newCounts.MID}-${newCounts.FWD}`;

    // Perform the swap
    setCurrentTeam(prev => ({
      ...prev,
      formation: newFormation,
      starting: startingIds.map(id => id === targetPlayer.id ? draggedPlayer.id : id),
      bench: benchIds.map(id => id === draggedPlayer.id ? targetPlayer.id : id)
    }));
    setDraggedPlayer(null);
  };

  // Handle drop on bench (move starter to bench)
  const handleDropOnBench = (e) => {
    e.preventDefault();
    if (!draggedPlayer || draggedPlayer.isFromBench) {
      setDraggedPlayer(null);
      return;
    }

    // Can't move to bench if bench is full
    if (benchPlayers.length >= 4) {
      setDraggedPlayer(null);
      return;
    }

    // Calculate new formation counts
    const newCounts = { ...startingCounts };
    newCounts[draggedPlayer.position]--;

    // Check minimum requirements
    if (newCounts.GKP < 1 || newCounts.DEF < 3 || newCounts.MID < 3 || newCounts.FWD < 1) {
      setDraggedPlayer(null);
      return;
    }

    // Get current lineup IDs
    const { startingIds, benchIds } = getCurrentLineup();

    // Calculate new formation string
    const newFormation = `${newCounts.DEF}-${newCounts.MID}-${newCounts.FWD}`;

    // Move starter to bench
    setCurrentTeam(prev => ({
      ...prev,
      formation: newFormation,
      starting: startingIds.filter(id => id !== draggedPlayer.id),
      bench: [...benchIds, draggedPlayer.id]
    }));
    setDraggedPlayer(null);
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

  // Load image helper
  const loadImage = (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  };

  // Export team as PNG with club badges
  const exportTeam = async () => {
    if (!pitchRef.current || exporting) return;

    setExporting(true);
    try {
      // Pre-load all team badges
      const badgeImages = {};
      const teamCodes = [...new Set(teamPlayers.map(p => p.team?.code))].filter(Boolean);

      await Promise.all(teamCodes.map(async (code) => {
        try {
          badgeImages[code] = await loadImage(`/fntsy/badges/t${code}.png`);
        } catch (e) {
          console.log('Could not load badge:', code);
        }
      }));

      // Get pitch dimensions
      const rect = pitchRef.current.getBoundingClientRect();
      const scale = 2;

      // Create canvas
      const canvas = document.createElement('canvas');
      canvas.width = rect.width * scale;
      canvas.height = rect.height * scale;
      const ctx = canvas.getContext('2d');
      ctx.scale(scale, scale);

      // Draw pitch background (green gradient stripes)
      const stripeHeight = rect.height / 12;
      for (let i = 0; i < 12; i++) {
        ctx.fillStyle = i % 2 === 0 ? '#1a472a' : '#1d5231';
        ctx.fillRect(0, i * stripeHeight, rect.width, stripeHeight);
      }

      // Draw pitch markings
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 2;

      // Center circle (at top)
      ctx.beginPath();
      ctx.arc(rect.width / 2, 0, 60, 0, Math.PI * 2);
      ctx.stroke();

      // Penalty box
      const boxWidth = rect.width * 0.6;
      ctx.strokeRect((rect.width - boxWidth) / 2, rect.height - 100, boxWidth, 100);

      // Goal box
      const goalWidth = rect.width * 0.3;
      ctx.strokeRect((rect.width - goalWidth) / 2, rect.height - 40, goalWidth, 40);

      // Draw players
      const playerEls = pitchRef.current.querySelectorAll('.builder-pitch__player, .builder-pitch__slot');

      for (const playerEl of playerEls) {
        const playerRect = playerEl.getBoundingClientRect();
        const x = playerRect.left - rect.left;
        const y = playerRect.top - rect.top;
        const w = playerRect.width;
        const h = playerRect.height;

        // Draw card background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
        ctx.beginPath();
        ctx.roundRect(x, y, w, h, 8);
        ctx.fill();

        // Get player data from element
        const nameEl = playerEl.querySelector('.player-card__name, .builder-pitch__slot-pos');
        const pointsEl = playerEl.querySelector('.player-card__points');
        const playerId = playerEl.dataset?.playerId;

        // Find the player data
        const playerData = teamPlayers.find(p => String(p.id) === playerId);
        const teamCode = playerData?.team?.code;

        // Draw badge if available
        if (teamCode && badgeImages[teamCode]) {
          const badge = badgeImages[teamCode];
          const badgeSize = 36;
          ctx.drawImage(badge, x + (w - badgeSize) / 2, y + 8, badgeSize, badgeSize);
        } else if (playerEl.classList.contains('builder-pitch__slot')) {
          // Empty slot - draw plus icon
          ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
          ctx.font = '24px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('+', x + w/2, y + 35);
        }

        // Draw name
        if (nameEl) {
          ctx.fillStyle = '#ffffff';
          ctx.font = 'bold 9px sans-serif';
          ctx.textAlign = 'center';
          const name = nameEl.textContent?.toUpperCase() || '';
          ctx.fillText(name.length > 10 ? name.slice(0, 10) + '.' : name, x + w/2, y + h - 18);
        }

        // Draw points
        if (pointsEl) {
          ctx.fillStyle = '#00ff87';
          ctx.font = 'bold 11px sans-serif';
          ctx.fillText(pointsEl.textContent || '', x + w/2, y + h - 5);
        }
      }

      // Draw formation badge
      ctx.fillStyle = '#daa520';
      ctx.beginPath();
      ctx.roundRect(8, rect.height - 28, 50, 20, 4);
      ctx.fill();
      ctx.fillStyle = '#0a0a0a';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      const formation = `${positionCounts.DEF}-${positionCounts.MID}-${positionCounts.FWD}`;
      ctx.fillText(formation, 33, rect.height - 14);

      // Draw team name at top
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(currentTeam.name.toUpperCase(), rect.width / 2, 20);

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

  // Render starting player slot
  const renderSlot = (position, index) => {
    // Before 15 players, use all teamPlayers; after 15, use only startingPlayers
    const playersInPos = currentTeam.players.length < 15
      ? teamPlayers.filter(p => p.position === position)
      : getPlayersInPosition(position);
    const player = playersInPos[index];

    if (player) {
      return (
        <div
          key={`${position}-${index}`}
          className={`builder-pitch__player ${draggedPlayer?.isFromBench ? 'drop-target' : ''}`}
          data-player-id={player.id}
          draggable
          onDragStart={(e) => handleDragStart(e, player, false)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDropOnStarter(e, player)}
          onDragEnd={() => setDraggedPlayer(null)}
        >
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

  // Render bench player
  const renderBenchPlayer = (player, index) => {
    if (!player) return null;
    return (
      <div
        key={player.id}
        className="builder-bench__player"
        data-player-id={player.id}
        draggable
        onDragStart={(e) => handleDragStart(e, player, true)}
        onDragEnd={() => setDraggedPlayer(null)}
      >
        <PlayerCard player={player} compact />
        <div className="builder-bench__actions">
          <button onClick={() => removePlayer(player.id)} title="Remove">×</button>
        </div>
      </div>
    );
  };

  // Formation string from starting counts
  const formation = `${startingCounts.DEF}-${startingCounts.MID}-${startingCounts.FWD}`;

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

      {/* Squad count with formation selector */}
      <div className="builder-squad-count">
        {currentTeam.players.length === 15 ? (
          <Dropdown
            value={currentTeam.formation || '3-4-3'}
            options={FORMATIONS.map(f => ({ value: f.value, label: f.value }))}
            onChange={changeFormation}
            label="Formation"
          />
        ) : (
          <span className="builder-squad-count__hint">Select 15 players</span>
        )}
        <span className={positionCounts.GKP === 2 ? 'complete' : ''}>GK: {positionCounts.GKP}/2</span>
        <span className={positionCounts.DEF === 5 ? 'complete' : ''}>DEF: {positionCounts.DEF}/5</span>
        <span className={positionCounts.MID === 5 ? 'complete' : ''}>MID: {positionCounts.MID}/5</span>
        <span className={positionCounts.FWD === 3 ? 'complete' : ''}>FWD: {positionCounts.FWD}/3</span>
        <span className={currentTeam.players.length === 15 ? 'complete' : ''}>
          Total: {currentTeam.players.length}/15
        </span>
      </div>

      {/* Pitch */}
      <div className={`builder-pitch ${currentTeam.players.length < 15 ? 'builder-pitch--no-bench' : ''}`} ref={pitchRef}>
        {currentTeam.players.length === 15 && (
          <span className="builder-pitch__formation">{formation}</span>
        )}

        <div className="builder-pitch__markings">
          <div className="builder-pitch__center-circle" />
          <div className="builder-pitch__penalty-box" />
          <div className="builder-pitch__goal-box" />
        </div>

        {currentTeam.players.length < 15 ? (
          <>
            {/* Show all 15 slots when building squad */}
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
          </>
        ) : (
          <>
            {/* Show formation-based starting 11 */}
            <div className="builder-pitch__row builder-pitch__row--fwd">
              {Array.from({ length: formationConfig.fwd }, (_, i) => renderSlot('FWD', i))}
            </div>
            <div className="builder-pitch__row builder-pitch__row--mid">
              {Array.from({ length: formationConfig.mid }, (_, i) => renderSlot('MID', i))}
            </div>
            <div className="builder-pitch__row builder-pitch__row--def">
              {Array.from({ length: formationConfig.def }, (_, i) => renderSlot('DEF', i))}
            </div>
            <div className="builder-pitch__row builder-pitch__row--gkp">
              {renderSlot('GKP', 0)}
            </div>
          </>
        )}
      </div>

      {/* Bench - only show when 15 players selected */}
      {currentTeam.players.length === 15 && (
        <div
          className={`builder-bench ${draggedPlayer && !draggedPlayer.isFromBench ? 'drop-target' : ''}`}
          onDragOver={handleDragOver}
          onDrop={handleDropOnBench}
        >
          <span className="builder-bench__label">BENCH</span>
          <div className="builder-bench__players">
            {benchPlayers.map((player, index) => renderBenchPlayer(player, index))}
          </div>
        </div>
      )}

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
