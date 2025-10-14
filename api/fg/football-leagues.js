export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { country } = req.query;
  const apiKey = process.env.FOOTBALL_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing FOOTBALL_API_KEY' });
  }

  try {
    const response = await fetch('https://api.football-data.org/v4/competitions', {
      headers: { 'X-Auth-Token': apiKey }
    });
    
    const data = await response.json();
    
    // Filter by country if specified
    let competitions = data.competitions || [];
    if (country) {
      competitions = competitions.filter(c => 
        c.area?.name?.toLowerCase() === country.toLowerCase() ||
        c.area?.code?.toLowerCase() === country.toLowerCase()
      );
    }
    
    return res.status(200).json({
      get: 'leagues',
      results: competitions.length,
      response: competitions
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch leagues' });
  }
}