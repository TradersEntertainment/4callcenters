import express from "express";
import { createServer as createViteServer } from "vite";
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fetch from 'node-fetch'; // Ensure node-fetch is used for easier stream handling if native fetch is tricky

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON bodies
  app.use(express.json());

  // Proxy for Google Places API (Text Search)
  app.get("/api/places/textsearch", async (req, res) => {
    try {
      const query = req.query.query;
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query as string)}&key=${GOOGLE_MAPS_API_KEY}`;
      
      const response = await fetch(url);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Proxy Error (Text Search):", error);
      res.status(500).json({ error: "Failed to fetch from Google Maps API" });
    }
  });

  // Proxy for Google Places API (Details)
  app.get("/api/places/details", async (req, res) => {
    try {
      const placeId = req.query.place_id;
      const fields = req.query.fields;
      const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=${fields}&key=${GOOGLE_MAPS_API_KEY}`;
      
      const response = await fetch(url);
      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Proxy Error (Details):", error);
      res.status(500).json({ error: "Failed to fetch place details" });
    }
  });

  // Proxy for Google Places API (Photo)
  app.get("/api/places/photo", async (req, res) => {
    try {
      const photoReference = req.query.photo_reference;
      const maxWidth = req.query.maxwidth || 400;
      const url = `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${GOOGLE_MAPS_API_KEY}`;
      
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.statusText}`);
      }

      // Forward content-type header
      const contentType = response.headers.get('content-type');
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }

      // Pipe the image data to the response
      response.body.pipe(res);

    } catch (error) {
      console.error("Proxy Error (Photo):", error);
      res.status(500).send("Failed to fetch photo");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Serve static files in production
    app.use(express.static('dist'));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
