import type { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    let query, pagetoken;

    // Support both GET query and POST JSON body just in case
    if (req.method === 'POST') {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      query = body?.query;
      pagetoken = body?.pagetoken;
    } else {
      query = req.query.query;
      pagetoken = req.query.pagetoken;
    }

    if (!query && !pagetoken) {
      return res.status(400).json({ error: "Query or pagetoken parameter is required" });
    }

    let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?key=${GOOGLE_MAPS_API_KEY}`;

    // According to Google API docs, pagetoken should be used ALONE without query.
    if (pagetoken) {
      url += `&pagetoken=${encodeURIComponent(pagetoken as string)}`;
    } else if (query) {
      url += `&query=${encodeURIComponent(query as string)}`;
    }

    let allResults: any[] = [];
    let currentToken = pagetoken;
    let pagesFetched = 0;
    const maxPages = 3; // Fetch up to 3 pages (60 results)
    let finalData: any = null;

    while (pagesFetched < maxPages) {
      let currentUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?key=${GOOGLE_MAPS_API_KEY}`;
      if (currentToken) {
        currentUrl += `&pagetoken=${encodeURIComponent(currentToken as string)}`;
      } else if (query) {
        currentUrl += `&query=${encodeURIComponent(query as string)}`;
      }

      console.log(`Fetching page ${pagesFetched + 1}...`);
      const response = await fetch(currentUrl);
      const data = await response.json();

      // If we get INVALID_REQUEST and we have a token, it means we need to wait longer
      if (data.status === 'INVALID_REQUEST' && currentToken) {
        console.log("Token not ready, waiting 2s...");
        await new Promise(r => setTimeout(r, 2000));
        continue; // Retry this loop
      }

      if (!finalData) {
        finalData = data; // Keep the original structure
      }

      if (data.results && data.results.length > 0) {
        allResults = allResults.concat(data.results);
      }

      currentToken = data.next_page_token;
      pagesFetched++;

      if (!currentToken) {
        break; // No more pages
      }

      // Google requires a short delay before the token is valid
      if (pagesFetched < maxPages) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    // Merge everything into the response
    if (finalData) {
      finalData.results = allResults;
      finalData.next_page_token = currentToken; // Any remaining token for the final UI if it still works
    }

    const dataToSend = finalData || { status: 'ZERO_RESULTS', results: [] };

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

    res.status(200).json(dataToSend);
  } catch (error) {
    console.error("Proxy Error (Text Search):", error);
    res.status(500).json({ error: "Failed to fetch from Google Maps API" });
  }
}
