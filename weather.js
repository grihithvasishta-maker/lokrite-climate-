export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");

  const { q, lat, lon, type } = req.query;
  const KEY = process.env.OWM_API_KEY;

  if (!KEY) {
    return res.status(500).json({ message: "API key not configured on server." });
  }

  if (!type || (!q && (!lat || !lon))) {
    return res.status(400).json({ message: "Missing required query parameters." });
  }

  const location = q
    ? `q=${encodeURIComponent(q)}`
    : `lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}`;

  const url = `https://api.openweathermap.org/data/2.5/${type}?${location}&appid=${KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    res.status(500).json({ message: "Failed to reach weather service." });
  }
}
