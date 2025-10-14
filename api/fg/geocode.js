export const config = { runtime: 'nodejs18.x' };
export default async function handler(req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const { address } = req.query || {};
    if (!address) return res.status(400).json({ error: 'address required' });

    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('address', String(address));
    url.searchParams.set('key', process.env.GOOGLE_SERVER_GEOCODING_KEY);

    const r = await fetch(url.toString());
    const data = await r.json();
    if (data.status !== 'OK' || !data.results?.length) {
      return res.status(400).json({ error: `geocode_failed:${data.status}`, raw: data });
    }

    const top = data.results[0];
    const comps = top.address_components || [];
    const country = comps.find(c => c.types?.includes('country'));
    const out = {
      lat: top.geometry?.location?.lat,
      lng: top.geometry?.location?.lng,
      countryCode: country?.short_name || null,
      countryName: country?.long_name || null
    };

    res.setHeader('Cache-Control', 'public, max-age=2592000'); // 30 days
    return res.status(200).json(out);
  } catch (e) {
    return res.status(500).json({ error: 'server_error', detail: String(e?.message || e) });
  }
}
