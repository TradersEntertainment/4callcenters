import { GoogleGenAI } from "@google/genai";

// Initialize Gemini API
// Note: The API key is automatically injected by the environment as process.env.GEMINI_API_KEY
// We use a fallback for development if needed, but in production it should use the env var.
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export interface Business {
  name: string;
  phones: string[];
  address: string;
  email: string;
  website: string;
  instagram: string;
  sector: string;
  employeeCount: string;
  latitude: number;
  longitude: number;
  mapsUri?: string;
  rating?: number;
  reviewCount?: number;
  adPotential?: string;
  isSimulated?: boolean;
  establishmentYear?: string;
  googleMapsDate?: string;
  imageUrl?: string;
}

export type CreativeFilter = 'none' | 'multi-branch' | 'high-reviews' | 'newly-opened' | 'ecommerce' | 'premium';

// Image library with multiple options per sector for variety
const SECTOR_IMAGES: Record<string, string[]> = {
  'Güzellik': [
    'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=500&q=80',
    'https://images.unsplash.com/photo-1522337660859-02fbefca4702?w=500&q=80',
    'https://images.unsplash.com/photo-1521590832896-401615e3d697?w=500&q=80',
    'https://images.unsplash.com/photo-1633681926022-84c23e8cb2d6?w=500&q=80',
    'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=500&q=80'
  ],
  'Diyet': [
    'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=500&q=80',
    'https://images.unsplash.com/photo-1498837167922-ddd27525d352?w=500&q=80',
    'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=500&q=80',
    'https://images.unsplash.com/photo-1493770348161-369560ae357d?w=500&q=80',
    'https://images.unsplash.com/photo-1505253758473-96b701d2cd3e?w=500&q=80'
  ],
  'Spor': [
    'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=500&q=80',
    'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=500&q=80',
    'https://images.unsplash.com/photo-1571902943202-507ec2618e8f?w=500&q=80',
    'https://images.unsplash.com/photo-1574680096145-d05b474e2155?w=500&q=80',
    'https://images.unsplash.com/photo-1593079831268-3381b0db4a77?w=500&q=80'
  ],
  'Spot': [
    'https://images.unsplash.com/photo-1556740758-90de2742e1e2?w=500&q=80',
    'https://images.unsplash.com/photo-1532453288672-3a27e9be9efd?w=500&q=80',
    'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&q=80'
  ],
  'Restoran': [
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=500&q=80',
    'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=500&q=80',
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=500&q=80',
    'https://images.unsplash.com/photo-1554118811-1e0d58224f24?w=500&q=80',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=500&q=80'
  ],
  'Turizm': [
    'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=500&q=80',
    'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=500&q=80',
    'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=500&q=80',
    'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=500&q=80'
  ],
  'Otomotiv': [
    'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=500&q=80',
    'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=500&q=80',
    'https://images.unsplash.com/photo-1489824904134-891ab64532f1?w=500&q=80',
    'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7?w=500&q=80'
  ],
  'Organizasyon': [
    'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=500&q=80',
    'https://images.unsplash.com/photo-1519671482502-9759101d4561?w=500&q=80',
    'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=500&q=80',
    'https://images.unsplash.com/photo-1530103862676-de3c9a59af38?w=500&q=80'
  ],
  'Üretim': [
    'https://images.unsplash.com/photo-1565514020176-db79360e2278?w=500&q=80',
    'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?w=500&q=80',
    'https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=500&q=80',
    'https://images.unsplash.com/photo-1537462713205-e51264198332?w=500&q=80'
  ],
  'Tekstil': [
    'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=500&q=80',
    'https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=500&q=80',
    'https://images.unsplash.com/photo-1558769132-cb1aea458c5e?w=500&q=80',
    'https://images.unsplash.com/photo-1551232864-3f0890e580d9?w=500&q=80'
  ],
  'Market': [
    'https://images.unsplash.com/photo-1542838132-92c53300491e?w=500&q=80',
    'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=500&q=80',
    'https://images.unsplash.com/photo-1583258292688-d0213dc5a3a8?w=500&q=80',
    'https://images.unsplash.com/photo-1604719312566-b7e605b6b421?w=500&q=80'
  ],
  'Mobilya': [
    'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=500&q=80',
    'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=500&q=80',
    'https://images.unsplash.com/photo-1618220179428-22790b461013?w=500&q=80',
    'https://images.unsplash.com/photo-1524758631624-e2822e304c36?w=500&q=80'
  ],
  'İnşaat': [
    'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=500&q=80',
    'https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=500&q=80',
    'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?w=500&q=80',
    'https://images.unsplash.com/photo-1590856029826-c7a73142bbf1?w=500&q=80'
  ],
  'Bilişim': [
    'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=500&q=80',
    'https://images.unsplash.com/photo-1504384308090-c54be9852d85?w=500&q=80',
    'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=500&q=80',
    'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=500&q=80'
  ],
  'Lojistik': [
    'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=500&q=80',
    'https://images.unsplash.com/photo-1566576912902-48f530699802?w=500&q=80',
    'https://images.unsplash.com/photo-1494412651409-ae1c40237c2d?w=500&q=80',
    'https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=500&q=80'
  ],
  'Genel': [
    'https://images.unsplash.com/photo-1497366216548-37526070297c?w=500&q=80',
    'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=500&q=80',
    'https://images.unsplash.com/photo-1554469384-e58fac16e23a?w=500&q=80',
    'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=500&q=80'
  ]
};

// Helper to get a relevant image based on sector and business name
function getSectorImage(sector: string, businessName: string): string {
  // Find matching key or return default
  const key = Object.keys(SECTOR_IMAGES).find(k => sector.includes(k)) || 'Genel';
  const images = SECTOR_IMAGES[key] || SECTOR_IMAGES['Genel'];

  // Use business name to deterministically pick an image
  // This ensures the same business always gets the same image, but different businesses get different images
  let hash = 0;
  for (let i = 0; i < businessName.length; i++) {
    hash = businessName.charCodeAt(i) + ((hash << 5) - hash);
  }

  const index = Math.abs(hash) % images.length;
  return images[index];
}

async function getPlaceDetails(placeId: string): Promise<any> {
  try {
    const fields = "formatted_phone_number,international_phone_number,website,url,opening_hours";
    const url = `/api/places/details?place_id=${placeId}&fields=${fields}`;
    const response = await fetch(url);
    const data = await response.json();
    return data.result || {};
  } catch (error) {
    console.error("Error fetching place details:", error);
    return {};
  }
}

export interface SearchResponse {
  businesses: Business[];
  nextPageToken: string;
}

export async function searchBusinesses(
  city: string,
  sectors: string[],
  excludeNames: string[] = [],
  requireInstagram: boolean = false,
  creativeFilter: CreativeFilter = 'none',
  country: string = 'Türkiye',
  pageToken: string = ''
): Promise<SearchResponse> {
  // Construct the search query
  const sectorQuery = sectors.join(' OR ');
  let locationQuery = "";

  if (country === 'Kıbrıs') {
    locationQuery = city === 'Tüm KKTC' ? "North Cyprus" : `${city}, North Cyprus`;
  } else {
    locationQuery = `${city}, Turkey`;
  }

  const query = `${sectorQuery} in ${locationQuery}`;

  let finalQuery = query;
  if (creativeFilter === 'multi-branch') finalQuery += " chain";

  try {
    let data: any;
    let attempts = 0;
    const maxAttempts = pageToken ? 3 : 1; // Retry only if using pagetoken

    while (attempts < maxAttempts) {
      let url = `/api/places/textsearch?`;
      if (pageToken) {
        url += `pagetoken=${pageToken}`;
      } else {
        url += `query=${encodeURIComponent(finalQuery)}`;
      }

      const response = await fetch(url);
      data = await response.json();

      if (data.status === 'INVALID_REQUEST' && pageToken) {
        // Token might not be ready yet, wait and retry
        attempts++;
        if (attempts < maxAttempts) {
          console.log(`Token not ready, waiting 2 seconds (attempt ${attempts}/${maxAttempts})...`);
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
      }
      break; // Exit loop if successful or max attempts reached
    }

    if (data.status !== 'OK' && data.status !== 'ZERO_RESULTS') {
      throw new Error(`Google Maps API Error: ${data.status} - ${data.error_message || 'Bilinmeyen hata'}`);
    }

    const results = data.results || [];

    // Filter and map results
    const topResults = results.slice(0, 8);

    const businesses: Business[] = await Promise.all(topResults.map(async (place: any) => {
      // Fetch details for phone number and website
      const details = await getPlaceDetails(place.place_id);

      // Construct Photo URL using Proxy
      let imageUrl = "";
      if (place.photos && place.photos.length > 0) {
        const photoRef = place.photos[0].photo_reference;
        imageUrl = `/api/places/photo?maxwidth=400&photo_reference=${photoRef}`;
      } else {
        // Fallback to sector image if no photo in Google Maps
        imageUrl = getSectorImage(sectors[0] || "Genel", place.name);
      }

      // Determine sector (use the first type or the searched sector)
      const sector = sectors[0] || "Genel"; // Simplified

      return {
        name: place.name,
        phones: details.formatted_phone_number ? [details.formatted_phone_number] : [],
        address: place.formatted_address,
        email: "Bilinmiyor", // Not available in Places API
        website: details.website || "Bilinmiyor",
        instagram: "Bilinmiyor", // Not directly available, user can use "Insta Bul"
        sector: sector,
        employeeCount: "Bilinmiyor",
        latitude: place.geometry.location.lat,
        longitude: place.geometry.location.lng,
        mapsUri: details.url || `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
        rating: place.rating,
        reviewCount: place.user_ratings_total,
        adPotential: place.rating > 4.5 ? "Yüksek Müşteri Memnuniyeti" : "Geliştirilebilir Dijital Varlık",
        isSimulated: false,
        establishmentYear: "", // Not available
        googleMapsDate: "", // Not available
        imageUrl: imageUrl
      };
    }));

    return { businesses, nextPageToken: data.next_page_token || '' };

  } catch (error) {
    console.error("Google Maps API Hatası:", error);
    throw new Error("Veri çekilirken bir hata oluştu. Lütfen tekrar deneyin.");
  }
}
