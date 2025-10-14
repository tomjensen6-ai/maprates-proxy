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
    
    // Return in the format App.js expects
    return res.status(200).json({
      competitions: data.competitions || [],
      count: data.count || data.competitions?.length || 0
    });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to fetch competitions' });
  }
}