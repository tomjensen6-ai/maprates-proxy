export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const apiKey = process.env.FOOTBALL_API_KEY;
  
  if (!apiKey) {
    return res.status(500).json({ error: 'Missing FOOTBALL_API_KEY' });
  }

  try {
    // Football-data.org returns competitions, we'll extract unique countries
    const response = await fetch('https://api.football-data.org/v4/competitions', {
      headers: { 'X-Auth-Token': apiKey }
    });
    
    const data = await response.json();
    
    // Extract unique countries from competitions
    const countries = [...new Set(data.competitions
      .filter(c => c.area && c.area.name)
      .map(c => ({
        name: c.area.name,
        code: c.area.code || c.area.name.substring(0, 3).toUpperCase(),
        flag: c.area.flag
      }))
    )];
    
    // Return in a format similar to api-sports
    return res.status(200).json({
      get: 'countries',
      results: countries.length,
      response: countries
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch countries' });
  }
}