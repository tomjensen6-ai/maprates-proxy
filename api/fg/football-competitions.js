export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { country, season, id } = req.query;
  const apiKey = process.env.FOOTBALL_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing FOOTBALL_API_KEY' });
  }

  // Build query parameters
  let url = 'https://v3.football.api-sports.io/leagues';
  const params = new URLSearchParams();
  if (country) params.append('country', country);
  if (season) params.append('season', season);
  if (id) params.append('id', id);
  
  if (params.toString()) {
    url += `?${params.toString()}`;
  }

  try {
    const response = await fetch(url, {
      headers: { 'x-apisports-key': apiKey }
    });
    
    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch competitions' });
  }
}