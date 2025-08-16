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
            // If no API key, try without it (free tier)
            console.log('No API key configured, trying free tier');
        }
        
        // Build URL - try the format that works in your local app
        let apiUrl = 'https://api.exchangerate.host/latest';
        
        // Add parameters
        const params = new URLSearchParams();
        if (apiKey) {
            params.append('access_key', apiKey);
        }
        params.append('base', base);
        if (symbols) {
            params.append('symbols', symbols);
        }
        
        apiUrl += '?' + params.toString();
        
        console.log('Fetching:', apiUrl.replace(apiKey || '', 'HIDDEN'));
        
        // Fetch from exchangerate.host
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        console.log('Response success:', data.success);
        
        // If we get an auth error and have a key, try without base parameter
        if (data.success === false && data.error?.code === 103 && apiKey) {
            console.log('Retrying without base parameter (EUR only)');
            
            // Some plans only support EUR as base
            const fallbackUrl = `https://api.exchangerate.host/latest?access_key=${apiKey}`;
            const fallbackResponse = await fetch(fallbackUrl);
            const fallbackData = await fallbackResponse.json();
            
            if (fallbackData.success) {
                // Convert from EUR to requested base if needed
                if (base !== 'EUR' && fallbackData.rates[base]) {
                    const conversionRate = fallbackData.rates[base];
                    const convertedRates = {};
                    
                    Object.keys(fallbackData.rates).forEach(currency => {
                        if (currency !== base) {
                            convertedRates[currency] = fallbackData.rates[currency] / conversionRate;
                        }
                    });
                    
                    data.success = true;
                    data.base = base;
                    data.rates = convertedRates;
                    data.date = fallbackData.date;
                } else {
                    data = fallbackData;
                }
            }
        }
        
        // Check for errors
        if (data.success === false) {
            return res.status(400).json({ 
                error: 'Exchange rate API error',
                details: data.error,
                note: 'Check if your plan supports the requested base currency'
            });
        }
        
        // Transform the response
        const transformedData = {
            success: true,
            base: data.base || base,
            date: data.date || new Date().toISOString().split('T')[0],
            rates: data.rates || {},
            timestamp: data.timestamp || Math.floor(new Date(data.date || Date.now()).getTime() / 1000)
        };
        
        // Filter symbols if specified
        if (symbols && transformedData.rates) {
            const symbolList = symbols.split(',').map(s => s.trim().toUpperCase());
            const filteredRates = {};
            symbolList.forEach(symbol => {
                if (transformedData.rates[symbol] !== undefined) {
                    filteredRates[symbol] = transformedData.rates[symbol];
                }
            });
            transformedData.rates = filteredRates;
        }
        
        // Cache for 1 hour
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