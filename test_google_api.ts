const API_KEY = process.env.GOOGLE_MAPS_API_KEY || "";

async function testGooglePlacesNew() {
  const url = `https://places.googleapis.com/v1/places:searchText`;
  const headers = {
    "Content-Type": "application/json",
    "X-Goog-Api-Key": API_KEY,
    "X-Goog-FieldMask": "places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.location,places.photos,places.primaryType,places.id"
  };
  const body = {
    "textQuery": "restaurants in Istanbul"
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body)
    });
    const data = await response.json();
    console.log("Status:", response.status);
    if (data.places && data.places.length > 0) {
      console.log("First result:", JSON.stringify(data.places[0], null, 2));
    } else {
      console.log("No results found or error:", JSON.stringify(data, null, 2));
    }
  } catch (error) {
    console.error("Error fetching:", error);
  }
}

testGooglePlacesNew();
