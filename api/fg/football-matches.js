export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { competition, dateFrom, dateTo } = req.query;
  const apiKey = process.env.FOOTBALL_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: 'Missing FOOTBALL_API_KEY' });
  }

  if (!competition || !/^\d+$/.test(competition)) {
    return res.status(400).json({ error: 'Invalid competition ID' });
  }

  if (dateFrom && !/^\d{4}-\d{2}-\d{2}$/.test(dateFrom)) {
    return res.status(400).json({ error: 'Invalid dateFrom' });
  }

  if (dateTo && !/^\d{4}-\d{2}-\d{2}$/.test(dateTo)) {
    return res.status(400).json({ error: 'Invalid dateTo' });
  }

  try {
    const params = new URLSearchParams();
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    const queryString = params.toString() ? `?${params.toString()}` : '';

    const response = await fetch(`https://api.football-data.org/v4/competitions/${competition}/matches${queryString}`, {
      headers: { 'X-Auth-Token': apiKey }
    });

    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch matches' });
    }

    const data = await response.json();

    res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400');
    return res.status(200).json({
      matches: data.matches || [],
      resultSet: data.resultSet || null,
      competition: data.competition || null
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch matches' });
  }
}
