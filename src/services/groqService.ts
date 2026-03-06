import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, this should be handled server-side
});

export async function generateSalesPitch(businessName: string, sector: string, city: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.error("GROQ_API_KEY is missing!");
    return "API Anahtarı eksik. Lütfen Vercel ayarlarınızı kontrol edin.";
  }

  try {
    const prompt = `
      Sen profesyonel bir medya satış danışmanısın.
      Hedef Müşteri: ${businessName} (${city} şehrinde, ${sector} sektöründe).
      
      Satılacak Ürün: Euro Star TV'de yayınlanan "Yaşam ve İş" programına konuk olma veya reklam verme fırsatı.
      
      Fiyat Bilgisi: Dakika başı ücret 4.250 TL + KDV.
      
      Görev: Bu işletmeyi aradığımızda veya ziyaret ettiğimizde kullanabileceğimiz etkileyici, kısa ve ikna edici bir satış konuşması metni (script) hazırla.
      
      Vurgulanacak Noktalar:
      1. Euro Star TV'nin Avrupa ve Türkiye'deki geniş izleyici kitlesi.
      2. "Yaşam ve İş" programının prestiji ve sektörel otorite katması.
      3. Rakiplerinden ayrışma fırsatı.
      4. Fiyatın sağladığı büyük görünürlüğe göre uygunluğu.
      
      Ton: Profesyonel, heyecan verici ama baskıcı olmayan, güven veren.
      
      Çıktı Formatı:
      - Giriş (Dikkat çekici selamlama)
      - Fırsat Sunumu (Euro Star TV & Program)
      - Değer Önerisi (Neden katılmalılar?)
      - Fiyat & Kapanış (Net teklif ve eylem çağrısı)
      
      Lütfen Türkçe yanıt ver.
    `;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        messages: [{ role: "user", content: prompt }],
        model: "mixtral-8x7b-32768",
        temperature: 0.7,
        max_tokens: 1024,
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Groq API Response Error:", data);
      throw new Error(data.error?.message || "Bilinmeyen API Hatası");
    }

    return data.choices?.[0]?.message?.content || "Satış metni oluşturulamadı.";
  } catch (error) {
    console.error("Groq Fetch Error:", error);
    return "Yapay zeka şu anda meşgul veya API bağlantısı başarısız, lütfen daha sonra tekrar deneyin.";
  }
}
