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
    const response = await fetch('https://api.football-data.org/v4/competitions', {
      headers: { 'X-Auth-Token': apiKey }
    });
    
    const data = await response.json();
    
    // Extract unique countries
    const countriesMap = new Map();
    (data.competitions || []).forEach(comp => {
      if (comp.area && comp.area.code) {
        countriesMap.set(comp.area.code, {
          name: comp.area.name,
          code: comp.area.code,
          flag: comp.area.flag
        });
      }
    });
    
    const countries = Array.from(countriesMap.values());
    
    return res.status(200).json({
      response: countries
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch countries' });
  }
}