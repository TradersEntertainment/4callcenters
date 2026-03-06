import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const query = req.query.query;
    const pagetoken = req.query.pagetoken;

    if (!query && !pagetoken) {
      return res.status(400).json({ error: "Query or pagetoken parameter is required" });
    }

    let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?key=${GOOGLE_MAPS_API_KEY}`;
    if (query) {
      url += `&query=${encodeURIComponent(query as string)}`;
    }
    if (pagetoken) {
      url += `&pagetoken=${pagetoken}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
      'Access-Control-Allow-Headers',
      'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
      res.status(200).end();
      return;
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Proxy Error (Text Search):", error);
    res.status(500).json({ error: "Failed to fetch from Google Maps API" });
  }
}
