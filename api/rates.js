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
            return res.status(500).json({ error: 'Server configuration error' });
        }
        
        // Build the API URL for ExchangeRate-API
        // Using v6 endpoint for better features
        const apiUrl = `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${base}`;
        
        // Fetch from ExchangeRate-API
        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            console.error('API response error:', response.status);
            return res.status(response.status).json({ 
                error: 'Failed to fetch exchange rates' 
            });
        }
        
        const data = await response.json();
        
        // Transform the response to match your app's expected format
        const transformedData = {
            success: data.result === 'success',
            base: data.base_code,
            date: data.time_last_update_utc,
            rates: data.conversion_rates,
            timestamp: data.time_last_update_unix
        };
        
        // If specific symbols were requested, filter the rates
        if (symbols) {
            const symbolList = symbols.split(',').map(s => s.trim().toUpperCase());
            const filteredRates = {};
            symbolList.forEach(symbol => {
                if (transformedData.rates[symbol]) {
                    filteredRates[symbol] = transformedData.rates[symbol];
                }
            });
            transformedData.rates = filteredRates;
        }
        
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