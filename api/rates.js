export default async function handler(req, res) {
    // Enable CORS for your frontend
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    // Only allow GET requests
    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }
    
    try {
        // Get parameters from query string
        const { base = 'USD', symbols } = req.query;
        
        // Get API key from environment variable
        const apiKey = process.env.EXCHANGE_API_KEY;
        
        if (!apiKey) {
            console.error('EXCHANGE_API_KEY not configured');
            return res.status(500).json({ error: 'Server configuration error - API key missing' });
        }
        
        // Build the API URL with access_key parameter
        let apiUrl = `https://api.exchangerate.host/latest?access_key=${apiKey}&base=${base}`;
        
        // Add symbols if specified
        if (symbols) {
            apiUrl += `&symbols=${symbols}`;
        }
        
        console.log('Fetching (key hidden):', apiUrl.replace(apiKey, 'HIDDEN'));
        
        // Fetch from exchangerate.host
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            console.error('API response error:', response.status);
            return res.status(response.status).json({ 
                error: 'Failed to fetch exchange rates' 
            });
        }
        
        const data = await response.json();
        
        // Check if the API returned an error
        if (data.success === false) {
            console.error('API error:', data.error);
            return res.status(400).json({ 
                error: 'Exchange rate API error',
                details: data.error
            });
        }
        
        // Transform the response to match your app's expected format
        const transformedData = {
            success: true,
            base: data.base || base,
            date: data.date || new Date().toISOString().split('T')[0],
            rates: data.rates || {},
            timestamp: Math.floor(new Date(data.date || Date.now()).getTime() / 1000)
        };
        
        // Cache the response for 1 hour
        res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate');
        
        return res.status(200).json(transformedData);
        
    } catch (error) {
        console.error('Proxy error:', error);
        return res.status(500).json({ 
            error: 'Internal server error',
            message: error.message 
        });
    }
}