export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { league, competition } = req.query;
  const apiKey = process.env.FOOTBALL_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing FOOTBALL_API_KEY' });
  }

  const competitionId = league || competition;
  
  if (!competitionId) {
    return res.status(400).json({ error: 'Competition ID required' });
  }

  try {
    const response = await fetch(`https://api.football-data.org/v4/competitions/${competitionId}/teams`, {
      headers: { 'X-Auth-Token': apiKey }
    });
    
    const data = await response.json();
    
    // Filter to only include teams from current season (2025-2026)
    const teams = data.teams || [];
    
    return res.status(200).json({
      teams: teams,
      season: data.season || {},
      competition: data.competition || {}
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch teams' });
  }
}