import { useState, useEffect, useCallback, useRef } from 'react';

const POSITIONS = {
  1: 'GKP',
  2: 'DEF',
  3: 'MID',
  4: 'FWD'
};

const STATUS_MAP = {
  'a': { text: 'Available', color: 'var(--status-available)' },
  'd': { text: 'Doubtful', color: 'var(--status-doubtful)' },
  'i': { text: 'Injured', color: 'var(--status-injured)' },
  's': { text: 'Suspended', color: 'var(--status-suspended)' },
  'u': { text: 'Unavailable', color: 'var(--status-injured)' },
  'n': { text: 'Not in squad', color: 'var(--text-muted)' }
};

// Use Vite proxy in dev, PHP proxy in production
const isDev = import.meta.env.DEV;
const getApiUrl = (endpoint) => {
  if (isDev) {
    return `/api/fpl/${endpoint}`;
  }
  return `/fntsy/proxy.php?endpoint=${encodeURIComponent(endpoint)}`;
};

// Stadium names by team short_name
const STADIUMS = {
  'ARS': 'Emirates Stadium',
  'AVL': 'Villa Park',
  'BOU': 'Vitality Stadium',
  'BRE': 'Gtech Community Stadium',
  'BHA': 'Amex Stadium',
  'BUR': 'Turf Moor',
  'CHE': 'Stamford Bridge',
  'CRY': 'Selhurst Park',
  'EVE': 'Goodison Park',
  'FUL': 'Craven Cottage',
  'LEE': 'Elland Road',
  'LEI': 'King Power Stadium',
  'LIV': 'Anfield',
  'MCI': 'Etihad Stadium',
  'MUN': 'Old Trafford',
  'NEW': 'St James\' Park',
  'NFO': 'City Ground',
  'SUN': 'Stadium of Light',
  'SOU': 'St Mary\'s Stadium',
  'TOT': 'Tottenham Hotspur Stadium',
  'WHU': 'London Stadium',
  'WOL': 'Molineux',
  'IPS': 'Portman Road',
};

// Stadium capacities
const CAPACITIES = {
  'ARS': 60704,
  'AVL': 42640,
  'BOU': 11307,
  'BRE': 17250,
  'BHA': 31800,
  'BUR': 21944,
  'CHE': 40343,
  'CRY': 25486,
  'EVE': 39414,
  'FUL': 25700,
  'IPS': 30311,
  'LEE': 37792,
  'LEI': 32312,
  'LIV': 61276,
  'MCI': 53400,
  'MUN': 74310,
  'NEW': 52305,
  'NFO': 30455,
  'SOU': 32384,
  'SUN': 48707,
  'TOT': 62850,
  'WHU': 62500,
  'WOL': 31750,
};

// Current managers (2024/25 season)
const MANAGERS = {
  'ARS': 'Mikel Arteta',
  'AVL': 'Unai Emery',
  'BOU': 'Andoni Iraola',
  'BRE': 'Keith Andrews',
  'BHA': 'Fabian Hürzeler',
  'BUR': 'Scott Parker',
  'CHE': 'Enzo Maresca',
  'CRY': 'Oliver Glasner',
  'EVE': 'David Moyes',
  'FUL': 'Marco Silva',
  'IPS': 'Kieran McKenna',
  'LEE': 'Daniel Farke',
  'LEI': 'Ruud van Nistelrooy',
  'LIV': 'Arne Slot',
  'MCI': 'Pep Guardiola',
  'MUN': 'Ruben Amorim',
  'NEW': 'Eddie Howe',
  'NFO': 'Sean Dyche',
  'SOU': 'Ivan Jurić',
  'SUN': 'Régis Le Bris',
  'TOT': 'Thomas Frank',
  'WHU': 'Nuno Espírito Santo',
  'WOL': 'Rob Edwards',
};

// Primary kit colors (hex)
const KIT_COLORS = {
  'ARS': { primary: '#EF0107', secondary: '#FFFFFF' },
  'AVL': { primary: '#670E36', secondary: '#95BFE5' },
  'BOU': { primary: '#DA291C', secondary: '#000000' },
  'BRE': { primary: '#E30613', secondary: '#FBB800' },
  'BHA': { primary: '#0057B8', secondary: '#FFFFFF' },
  'CHE': { primary: '#034694', secondary: '#FFFFFF' },
  'CRY': { primary: '#1B458F', secondary: '#C4122E' },
  'EVE': { primary: '#003399', secondary: '#FFFFFF' },
  'FUL': { primary: '#FFFFFF', secondary: '#000000' },
  'IPS': { primary: '#0044AA', secondary: '#FFFFFF' },
  'LEI': { primary: '#003090', secondary: '#FDBE11' },
  'LIV': { primary: '#C8102E', secondary: '#FFFFFF' },
  'MCI': { primary: '#6CABDD', secondary: '#FFFFFF' },
  'MUN': { primary: '#DA291C', secondary: '#FBE122' },
  'NEW': { primary: '#241F20', secondary: '#FFFFFF' },
  'NFO': { primary: '#DD0000', secondary: '#FFFFFF' },
  'SOU': { primary: '#D71920', secondary: '#FFFFFF' },
  'TOT': { primary: '#FFFFFF', secondary: '#132257' },
  'WHU': { primary: '#7A263A', secondary: '#1BB1E7' },
  'WOL': { primary: '#FDB913', secondary: '#231F20' },
};

// Check if player has left permanently (not loans - they're still playing)
const hasLeftPermanently = (player) => {
  const news = player.news?.toLowerCase() || '';
  if (news.includes('joined') && news.includes('permanent')) return true;
  if (news.includes('left the club')) return true;
  if (news.includes('transferred to')) return true;
  return false;
};

// Polling interval for live data (30 seconds for real-time feel)
const LIVE_POLL_INTERVAL = 30000;

export function useFPLData() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isLive, setIsLive] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const baseDataRef = useRef(null);
  const intervalRef = useRef(null);

  const prevLiveStatsRef = useRef({});

  // Fetch live gameweek data and merge with base data
  const fetchLiveData = useCallback(async (gameweek, basePlayers) => {
    try {
      const liveRes = await fetch(getApiUrl(`event/${gameweek}/live/`));
      if (!liveRes.ok) return null;
      const liveData = await liveRes.json();

      // Create lookup for live stats
      const liveStats = {};
      liveData.elements?.forEach(el => {
        liveStats[el.id] = el.stats;
      });

      // Get previous stats for change tracking
      const prevStats = prevLiveStatsRef.current;

      // Merge live stats into players with change tracking
      const updatedPlayers = basePlayers.map(player => {
        const live = liveStats[player.id];
        if (!live) return player;

        const prev = prevStats[player.id] || {};

        // Calculate changes from previous update
        const pointsChange = (live.total_points || 0) - (prev.total_points || 0);
        const goalsChange = (live.goals_scored || 0) - (prev.goals_scored || 0);
        const assistsChange = (live.assists || 0) - (prev.assists || 0);
        const bpsChange = (live.bps || 0) - (prev.bps || 0);
        const bonusChange = (live.bonus || 0) - (prev.bonus || 0);

        return {
          ...player,
          // Live GW stats
          liveMinutes: live.minutes || 0,
          liveGoals: live.goals_scored || 0,
          liveAssists: live.assists || 0,
          liveCleanSheets: live.clean_sheets || 0,
          liveYellowCards: live.yellow_cards || 0,
          liveRedCards: live.red_cards || 0,
          liveSaves: live.saves || 0,
          livePenaltiesSaved: live.penalties_saved || 0,
          livePenaltiesMissed: live.penalties_missed || 0,
          liveBonus: live.bonus || 0,
          liveBps: live.bps || 0,
          livePoints: live.total_points || 0,
          hasLiveData: true,
          // Changes since last update
          pointsChange,
          goalsChange,
          assistsChange,
          bpsChange,
          bonusChange,
          hasChanges: pointsChange !== 0 || goalsChange !== 0 || assistsChange !== 0
        };
      });

      // Store current stats as previous for next update
      prevLiveStatsRef.current = liveStats;

      return updatedPlayers;
    } catch (err) {
      console.error('Failed to fetch live data:', err);
      return null;
    }
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Fetch bootstrap data and fixtures in parallel
        const [bootstrapRes, fixturesRes] = await Promise.all([
          fetch(getApiUrl('bootstrap-static/')),
          fetch(getApiUrl('fixtures/'))
        ]);
        if (!bootstrapRes.ok) throw new Error('Failed to fetch FPL data');
        const bootstrap = await bootstrapRes.json();
        const fixtures = fixturesRes.ok ? await fixturesRes.json() : [];

        // Create team lookup with full info
        const teamLookup = {};
        bootstrap.teams.forEach(t => {
          teamLookup[t.id] = {
            id: t.id,
            code: t.code,
            name: t.name,
            shortName: t.short_name,
            stadium: STADIUMS[t.short_name] || null,
            capacity: CAPACITIES[t.short_name] || null,
            manager: MANAGERS[t.short_name] || null,
            kitColors: KIT_COLORS[t.short_name] || null,
            strength: t.strength,
            strengthHome: t.strength_overall_home,
            strengthAway: t.strength_overall_away,
            attackHome: t.strength_attack_home,
            attackAway: t.strength_attack_away,
            defenceHome: t.strength_defence_home,
            defenceAway: t.strength_defence_away
          };
        });

        // Get ALL players with team info
        const allPlayers = bootstrap.elements
          .filter(p => !hasLeftPermanently(p)) // Filter out permanent transfers
          .map(p => ({
            id: p.id,
            code: p.code,
            firstName: p.first_name,
            lastName: p.second_name,
            webName: p.web_name,
            position: POSITIONS[p.element_type],
            positionId: p.element_type,
            teamId: p.team,
            team: teamLookup[p.team],
            squadNumber: p.squad_number,
            price: p.now_cost / 10,
            totalPoints: p.total_points,
            pointsPerGame: parseFloat(p.points_per_game) || 0,
            form: parseFloat(p.form) || 0,
            selectedBy: parseFloat(p.selected_by_percent) || 0,
            status: STATUS_MAP[p.status] || STATUS_MAP['a'],
            statusCode: p.status,
            news: p.news,
            chanceOfPlaying: p.chance_of_playing_next_round ?? 100,
            // Stats
            minutes: p.minutes,
            goals: p.goals_scored,
            assists: p.assists,
            cleanSheets: p.clean_sheets,
            goalsConceded: p.goals_conceded,
            yellowCards: p.yellow_cards,
            redCards: p.red_cards,
            bonus: p.bonus,
            bps: p.bps,
            // Expected stats
            xG: parseFloat(p.expected_goals) || 0,
            xA: parseFloat(p.expected_assists) || 0,
            xGI: parseFloat(p.expected_goal_involvements) || 0,
            xGC: parseFloat(p.expected_goals_conceded) || 0,
            // ICT
            influence: parseFloat(p.influence) || 0,
            creativity: parseFloat(p.creativity) || 0,
            threat: parseFloat(p.threat) || 0,
            ictIndex: parseFloat(p.ict_index) || 0,
            // Transfers
            transfersIn: p.transfers_in_event,
            transfersOut: p.transfers_out_event,
            costChange: p.cost_change_event / 10,
            costChangeSeason: p.cost_change_start / 10,
            // Photo URLs to try in order (premierleague25 CDN is more reliable for newer players)
            photoUrls: (() => {
              const photoId = p.photo?.replace('.jpg', '').replace('.png', '');
              return [
                // Try premierleague25 with photoId first (most reliable for new players)
                photoId ? `https://resources.premierleague.com/premierleague25/photos/players/110x140/${photoId}.png` : null,
                photoId ? `https://resources.premierleague.com/premierleague25/photos/players/250x250/${photoId}.png` : null,
                // Then try old CDN with p+code
                `https://resources.premierleague.com/premierleague/photos/players/250x250/p${p.code}.png`,
                // Then premierleague25 with p+code
                `https://resources.premierleague.com/premierleague25/photos/players/110x140/p${p.code}.png`,
                `https://resources.premierleague.com/premierleague25/photos/players/250x250/p${p.code}.png`,
              ].filter(Boolean);
            })()
          }));

        // Get current gameweek
        const currentGW = bootstrap.events.find(e => e.is_current)?.id || 1;

        // All teams sorted alphabetically
        const teams = Object.values(teamLookup).sort((a, b) =>
          a.name.localeCompare(b.name)
        );

        // Process fixtures - get recent results and upcoming
        const processedFixtures = fixtures.map(f => {
          // Count cards from stats
          const yellowCards = f.stats?.find(s => s.identifier === 'yellow_cards');
          const redCards = f.stats?.find(s => s.identifier === 'red_cards');
          const totalYellows = (yellowCards?.h?.length || 0) + (yellowCards?.a?.length || 0);
          const totalReds = (redCards?.h?.length || 0) + (redCards?.a?.length || 0);

          return {
            id: f.id,
            gameweek: f.event,
            homeTeam: teamLookup[f.team_h],
            awayTeam: teamLookup[f.team_a],
            homeScore: f.team_h_score,
            awayScore: f.team_a_score,
            homeDifficulty: f.team_h_difficulty,
            awayDifficulty: f.team_a_difficulty,
            finished: f.finished,
            started: f.started,
            kickoffTime: f.kickoff_time,
            yellowCards: totalYellows,
            redCards: totalReds,
          };
        });

        // Find the gameweek to display in ticker
        // Show current GW if any fixtures have started, otherwise most recent completed GW
        const finishedFixtures = processedFixtures.filter(f => f.finished);
        const currentGWStarted = processedFixtures.filter(f => f.gameweek === currentGW && f.started);
        const currentGWFinished = finishedFixtures.filter(f => f.gameweek === currentGW);

        // Use current GW if any matches have started, otherwise fall back to last completed GW
        const resultsGW = currentGWStarted.length > 0
          ? currentGW
          : [...new Set(finishedFixtures.map(f => f.gameweek))].sort((a, b) => b - a)[0] || currentGW;

        // Get fixtures for the results gameweek (include started but not finished if current GW)
        const resultsFixtures = resultsGW === currentGW
          ? processedFixtures.filter(f => f.gameweek === resultsGW && f.started)
          : finishedFixtures.filter(f => f.gameweek === resultsGW);

        // Deduplicate by fixture ID
        const seenIds = new Set();
        const recentResults = resultsFixtures
          .filter(f => {
            if (seenIds.has(f.id)) return false;
            seenIds.add(f.id);
            return true;
          })
          .sort((a, b) => new Date(b.kickoffTime) - new Date(a.kickoffTime));

        // Upcoming fixtures (next 10)
        const upcomingFixtures = processedFixtures
          .filter(f => !f.finished && f.kickoffTime)
          .sort((a, b) => new Date(a.kickoffTime) - new Date(b.kickoffTime))
          .slice(0, 10);

        // Check if there are live matches (started but not finished)
        const liveMatches = processedFixtures.filter(f => f.started && !f.finished);
        const hasLiveMatches = liveMatches.length > 0;

        // Check if any matches have been played this GW (for showing GW points even after matches end)
        const currentGWPlayed = processedFixtures.filter(f => f.gameweek === currentGW && f.started);
        const hasCurrentGWData = currentGWPlayed.length > 0;

        // Store base data for live updates
        baseDataRef.current = {
          players: allPlayers,
          teams,
          currentGameweek: currentGW,
          resultsGameweek: resultsGW,
          recentResults,
          upcomingFixtures,
          allFixtures: processedFixtures
        };

        // Always fetch live data if any matches have been played this GW
        let finalPlayers = allPlayers;
        if (hasCurrentGWData) {
          const livePlayers = await fetchLiveData(currentGW, allPlayers);
          if (livePlayers) {
            finalPlayers = livePlayers;
          }
        }

        setData({
          players: finalPlayers,
          teams,
          currentGameweek: currentGW,
          resultsGameweek: resultsGW,
          recentResults,
          upcomingFixtures,
          allFixtures: processedFixtures
        });
        setIsLive(hasLiveMatches);
        setLastUpdated(new Date());
        setError(null);

        // Set up polling for live data
        if (hasLiveMatches) {
          intervalRef.current = setInterval(async () => {
            if (!baseDataRef.current) return;
            const livePlayers = await fetchLiveData(currentGW, baseDataRef.current.players);
            if (livePlayers) {
              setData(prev => prev ? { ...prev, players: livePlayers } : prev);
              setLastUpdated(new Date());
            }
          }, LIVE_POLL_INTERVAL);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchData();

    // Cleanup polling on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchLiveData]);

  return { data, loading, error, isLive, lastUpdated };
}

// Hook to fetch user's FPL team
export function useMyTeam(teamId, allPlayers, currentGameweek) {
  const [myTeam, setMyTeam] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!teamId || !allPlayers?.length || !currentGameweek) return;

    async function fetchMyTeam() {
      try {
        setLoading(true);
        setError(null);

        // Fetch team info and current GW picks in parallel
        const [entryRes, picksRes] = await Promise.all([
          fetch(getApiUrl(`entry/${teamId}/`)),
          fetch(getApiUrl(`entry/${teamId}/event/${currentGameweek}/picks/`))
        ]);

        if (!entryRes.ok) throw new Error('Team not found');
        if (!picksRes.ok) throw new Error('Could not fetch picks');

        const entry = await entryRes.json();
        const picks = await picksRes.json();

        // Create player lookup
        const playerLookup = {};
        allPlayers.forEach(p => { playerLookup[p.id] = p; });

        // Map picks to full player data
        const squad = picks.picks.map(pick => ({
          ...playerLookup[pick.element],
          isCaptain: pick.is_captain,
          isViceCaptain: pick.is_vice_captain,
          multiplier: pick.multiplier,
          pickPosition: pick.position, // 1-11 starting, 12-15 bench
          isBench: pick.position > 11
        }));

        setMyTeam({
          id: teamId,
          name: entry.name,
          managerName: `${entry.player_first_name} ${entry.player_last_name}`,
          overallPoints: entry.summary_overall_points,
          overallRank: entry.summary_overall_rank,
          gameweekPoints: picks.entry_history.points,
          gameweekRank: picks.entry_history.rank,
          bank: picks.entry_history.bank / 10,
          teamValue: picks.entry_history.value / 10,
          transfers: picks.entry_history.event_transfers,
          transfersCost: picks.entry_history.event_transfers_cost,
          squad,
          activeChip: picks.active_chip
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchMyTeam();
  }, [teamId, allPlayers, currentGameweek]);

  return { myTeam, loading, error };
}

// Helper to get top N players by position
export function getTopPlayersByPosition(players, sortKey = 'form', count = 5) {
  const positions = ['GKP', 'DEF', 'MID', 'FWD'];
  const result = {};

  positions.forEach(pos => {
    result[pos] = [...players]
      .filter(p => p.position === pos)
      .sort((a, b) => (b[sortKey] || 0) - (a[sortKey] || 0))
      .slice(0, count);
  });

  return result;
}

// Helper to get players by team
export function getPlayersByTeam(players, teamId) {
  return players
    .filter(p => p.teamId === teamId)
    .sort((a, b) => a.positionId - b.positionId || b.totalPoints - a.totalPoints);
}

// Helper to get fixtures by team
export function getFixturesByTeam(fixtures, teamId) {
  return fixtures.filter(f =>
    f.homeTeam?.id === teamId || f.awayTeam?.id === teamId
  );
}

// Helper to get recent results for a team
export function getTeamResults(fixtures, teamId, count = 5) {
  return fixtures
    .filter(f => f.finished && (f.homeTeam?.id === teamId || f.awayTeam?.id === teamId))
    .sort((a, b) => new Date(b.kickoffTime) - new Date(a.kickoffTime))
    .slice(0, count);
}

// Helper to get upcoming fixtures for a team
export function getTeamUpcoming(fixtures, teamId, count = 5) {
  return fixtures
    .filter(f => !f.finished && f.kickoffTime && (f.homeTeam?.id === teamId || f.awayTeam?.id === teamId))
    .sort((a, b) => new Date(a.kickoffTime) - new Date(b.kickoffTime))
    .slice(0, count);
}

// Helper to get FDR calendar for a team
export function getTeamFDR(fixtures, teamId) {
  return fixtures
    .filter(f => !f.finished && f.kickoffTime && (f.homeTeam?.id === teamId || f.awayTeam?.id === teamId))
    .sort((a, b) => new Date(a.kickoffTime) - new Date(b.kickoffTime))
    .map(f => {
      const isHome = f.homeTeam?.id === teamId;
      return {
        gameweek: f.gameweek,
        opponent: isHome ? f.awayTeam : f.homeTeam,
        isHome,
        difficulty: isHome ? f.homeDifficulty : f.awayDifficulty,
        kickoffTime: f.kickoffTime
      };
    });
}

// Calculate predicted points for a player based on upcoming fixture
export function calculatePredictedPoints(player, fixtures, currentGameweek) {
  if (!player || !fixtures?.length) return { predicted: 0, confidence: 0, breakdown: {} };

  // Get next fixture for this player's team
  const nextFixture = fixtures
    .filter(f => !f.finished && f.gameweek >= currentGameweek &&
      (f.homeTeam?.id === player.teamId || f.awayTeam?.id === player.teamId))
    .sort((a, b) => a.gameweek - b.gameweek)[0];

  if (!nextFixture) return { predicted: 0, confidence: 0, breakdown: {} };

  const isHome = nextFixture.homeTeam?.id === player.teamId;
  const opponent = isHome ? nextFixture.awayTeam : nextFixture.homeTeam;
  const difficulty = isHome ? nextFixture.homeDifficulty : nextFixture.awayDifficulty;

  // Base expected points from form and PPG
  const baseExpected = (player.form * 0.6) + (player.pointsPerGame * 0.4);

  // Fixture difficulty modifier (FDR 1-5 -> multiplier 1.3-0.7)
  const fdrModifier = 1.4 - (difficulty * 0.15);

  // Minutes probability (based on chance of playing)
  const minutesProb = (player.chanceOfPlaying ?? 100) / 100;

  // Position-specific calculations
  let predicted = 0;
  let breakdown = {};

  const position = player.position;

  if (position === 'GKP') {
    // GKP: Clean sheet probability + save points
    // Opponent attack strength vs team defence
    const oppAttack = isHome ? (opponent?.attackAway || 1000) : (opponent?.attackHome || 1000);
    const ownDefence = isHome ? (player.team?.defenceHome || 1000) : (player.team?.defenceAway || 1000);

    // Clean sheet probability (higher own defence, lower opp attack = higher CS chance)
    const csProb = Math.min(0.5, Math.max(0.05, (ownDefence - oppAttack + 200) / 800));
    const csPoints = csProb * 4; // 4 points for CS

    // Base appearance points
    const appearPoints = 2 * minutesProb;

    // Save points estimate (more saves vs stronger attacks)
    const savePoints = Math.min(2, (oppAttack / 1200) * 1.5);

    predicted = (appearPoints + csPoints + savePoints) * fdrModifier;
    breakdown = { appearance: appearPoints, cleanSheet: csPoints, saves: savePoints, fdrMod: fdrModifier };

  } else if (position === 'DEF') {
    // DEF: Clean sheet + goal threat from set pieces
    const oppAttack = isHome ? (opponent?.attackAway || 1000) : (opponent?.attackHome || 1000);
    const ownDefence = isHome ? (player.team?.defenceHome || 1000) : (player.team?.defenceAway || 1000);

    const csProb = Math.min(0.45, Math.max(0.05, (ownDefence - oppAttack + 200) / 800));
    const csPoints = csProb * 4;

    const appearPoints = 2 * minutesProb;

    // Goal/assist potential from xGI
    const attackPoints = (player.xGI / Math.max(1, player.minutes / 90)) * 6 * minutesProb;

    // Bonus potential based on BPS
    const bonusPoints = Math.min(1, (player.bps / Math.max(1, player.minutes / 90)) / 30);

    predicted = (appearPoints + csPoints + attackPoints + bonusPoints) * fdrModifier;
    breakdown = { appearance: appearPoints, cleanSheet: csPoints, attacking: attackPoints, bonus: bonusPoints };

  } else if (position === 'MID') {
    // MID: Goals and assists weighted heavily
    const oppDefence = isHome ? (opponent?.defenceAway || 1000) : (opponent?.defenceHome || 1000);
    const defenceModifier = Math.max(0.7, Math.min(1.3, 1100 / oppDefence));

    const appearPoints = 2 * minutesProb;

    // xG -> goals (5 pts each for mids)
    const xGPer90 = player.xG / Math.max(1, player.minutes / 90);
    const goalPoints = xGPer90 * 5 * defenceModifier * minutesProb;

    // xA -> assists (3 pts each)
    const xAPer90 = player.xA / Math.max(1, player.minutes / 90);
    const assistPoints = xAPer90 * 3 * defenceModifier * minutesProb;

    // Creativity/threat bonus
    const ictBonus = Math.min(1.5, (player.ictIndex / Math.max(1, player.minutes / 90)) / 8);

    predicted = (appearPoints + goalPoints + assistPoints + ictBonus) * fdrModifier;
    breakdown = { appearance: appearPoints, goals: goalPoints, assists: assistPoints, ict: ictBonus };

  } else if (position === 'FWD') {
    // FWD: Goals heavily weighted
    const oppDefence = isHome ? (opponent?.defenceAway || 1000) : (opponent?.defenceHome || 1000);
    const defenceModifier = Math.max(0.7, Math.min(1.3, 1100 / oppDefence));

    const appearPoints = 2 * minutesProb;

    // xG -> goals (4 pts each for fwds)
    const xGPer90 = player.xG / Math.max(1, player.minutes / 90);
    const goalPoints = xGPer90 * 4 * defenceModifier * minutesProb;

    // xA -> assists (3 pts each)
    const xAPer90 = player.xA / Math.max(1, player.minutes / 90);
    const assistPoints = xAPer90 * 3 * defenceModifier * minutesProb;

    // Threat bonus (forwards get more from high threat)
    const threatBonus = Math.min(1.5, (player.threat / Math.max(1, player.minutes / 90)) / 50);

    predicted = (appearPoints + goalPoints + assistPoints + threatBonus) * fdrModifier;
    breakdown = { appearance: appearPoints, goals: goalPoints, assists: assistPoints, threat: threatBonus };
  }

  // Apply form trend adjustment
  const formTrend = player.form > player.pointsPerGame ? 1.1 : 0.95;
  predicted *= formTrend;

  // Blend with historical (base expected) for stability
  predicted = (predicted * 0.7) + (baseExpected * 0.3);

  // Confidence based on minutes played and data quality
  const confidence = Math.min(100, Math.max(20,
    (player.minutes / 30) + // More minutes = more confidence
    (player.form > 0 ? 20 : 0) + // Has recent form
    (player.xGI > 0 ? 10 : 0) // Has xG data
  ));

  return {
    predicted: Math.round(predicted * 10) / 10,
    confidence: Math.round(confidence),
    nextOpponent: opponent,
    isHome,
    difficulty,
    breakdown
  };
}

// Helper to add predictions to all players
export function addPredictions(players, fixtures, currentGameweek) {
  return players.map(player => {
    const prediction = calculatePredictedPoints(player, fixtures, currentGameweek);
    return {
      ...player,
      predictedPoints: prediction.predicted,
      predictionConfidence: prediction.confidence,
      nextOpponent: prediction.nextOpponent,
      nextIsHome: prediction.isHome,
      nextDifficulty: prediction.difficulty
    };
  });
}

// Hook to fetch Dream Team for a gameweek
export function useDreamTeam(gameweek, allPlayers) {
  const [dreamTeam, setDreamTeam] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!gameweek || !allPlayers?.length) return;

    async function fetchDreamTeam() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(getApiUrl(`dream-team/${gameweek}/`));
        if (!res.ok) throw new Error('Failed to fetch dream team');

        const data = await res.json();

        // Map player IDs to full player data
        const squad = data.team.map(pick => {
          const player = allPlayers.find(p => p.id === pick.element);
          return {
            ...player,
            dreamTeamPoints: pick.points,
            dreamTeamPosition: pick.position
          };
        }).filter(Boolean);

        // Group by position
        const gkp = squad.filter(p => p.position === 'GKP');
        const def = squad.filter(p => p.position === 'DEF');
        const mid = squad.filter(p => p.position === 'MID');
        const fwd = squad.filter(p => p.position === 'FWD');

        // Find top player
        const topPlayer = allPlayers.find(p => p.id === data.top_player?.id);

        setDreamTeam({
          squad,
          gkp,
          def,
          mid,
          fwd,
          topPlayer: topPlayer ? { ...topPlayer, points: data.top_player.points } : null,
          totalPoints: squad.reduce((sum, p) => sum + p.dreamTeamPoints, 0)
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchDreamTeam();
  }, [gameweek, allPlayers]);

  return { dreamTeam, loading, error };
}
