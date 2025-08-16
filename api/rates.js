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
            return res.status(500).json({ error: 'API key not configured' });
        }
        
        // Use /live endpoint which is available on basic plans
        // Note: /live endpoint typically only supports USD as source
        let apiUrl = `https://api.exchangerate.host/live?access_key=${apiKey}`;
        
        // Add source currency (usually only USD is supported)
        apiUrl += `&source=${base}`;
        
        // Add currencies parameter if symbols specified
        if (symbols) {
            apiUrl += `&currencies=${symbols}`;
        }
        
        console.log('Fetching /live endpoint:', apiUrl.replace(apiKey, 'HIDDEN'));
        
        // Fetch from exchangerate.host
        const response = await fetch(apiUrl);
        const data = await response.json();
        
        console.log('Response success:', data.success);
        console.log('Response has quotes:', !!data.quotes);
        
        // If /live fails, try /convert for single currency
        if (data.success === false && symbols) {
            console.log('Trying /convert endpoint as fallback');
            
            const symbolList = symbols.split(',')[0]; // Get first symbol
            const convertUrl = `https://api.exchangerate.host/convert?access_key=${apiKey}&from=${base}&to=${symbolList}&amount=1`;
            
            console.log('Convert URL:', convertUrl.replace(apiKey, 'HIDDEN'));
            
            const convertResponse = await fetch(convertUrl);
            const convertData = await convertResponse.json();
            
            console.log('Convert response:', convertData.success);
            
            if (convertData.success) {
                // Format as rates response
                return res.status(200).json({
                    success: true,
                    base: base,
                    date: convertData.date || new Date().toISOString().split('T')[0],
                    rates: {
                        [symbolList]: convertData.result || convertData.info?.rate
                    },
                    timestamp: Date.now() / 1000
                });
            }
        }
        
        // Check for API errors
        if (data.success === false) {
            // If source currency not supported, try with USD then convert
            if (data.error?.code === 201 && base !== 'USD') {
                console.log('Retrying with USD as source');
                
                const usdUrl = `https://api.exchangerate.host/live?access_key=${apiKey}&source=USD`;
                const usdResponse = await fetch(usdUrl);
                const usdData = await usdResponse.json();
                
                if (usdData.success && usdData.quotes) {
                    // Convert from USD-based rates to requested base
                    const baseKey = `USD${base}`;
                    if (usdData.quotes[baseKey]) {
                        const baseRate = usdData.quotes[baseKey];
                        const convertedRates = {};
                        
                        // Convert all rates relative to new base
                        Object.keys(usdData.quotes).forEach(key => {
                            const currency = key.replace('USD', '');
                            if (currency && currency !== base) {
                                convertedRates[currency] = usdData.quotes[key] / baseRate;
                            }
                        });
                        
                        data.success = true;
                        data.quotes = convertedRates;
                        data.source = base;
                    }
                }
            }
            
            if (!data.success) {
                return res.status(400).json({ 
                    error: 'Exchange rate API error',
                    details: data.error,
                    note: 'Your plan may only support USD as source currency'
                });
            }
        }
        
        // Transform /live response format to standard format
        let rates = {};
        
        if (data.quotes) {
            // /live endpoint returns quotes like "USDEUR": 0.95
            const source = data.source || base;
            Object.keys(data.quotes).forEach(key => {
                // Extract currency code (remove source prefix)
                const currency = key.substring(3); // Remove 'USD' or other 3-letter source
                if (currency) {
                    rates[currency] = data.quotes[key];
                }
            });
        }
        
        // Filter to requested symbols if specified
        if (symbols) {
            const symbolList = symbols.split(',').map(s => s.trim().toUpperCase());
            const filteredRates = {};
            symbolList.forEach(symbol => {
                if (rates[symbol] !== undefined) {
                    filteredRates[symbol] = rates[symbol];
                }
            });
            rates = filteredRates;
        }
        
        // Return transformed response
        const transformedData = {
            success: true,
            base: data.source || base,
            date: data.date || new Date().toISOString().split('T')[0],
            rates: rates,
            timestamp: data.timestamp || Math.floor(Date.now() / 1000)
        };
        
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