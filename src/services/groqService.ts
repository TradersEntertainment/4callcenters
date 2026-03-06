import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export async function generateSalesPitch(businessName: string, sector: string, city: string): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing!");
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
      
      Lütfen Türkçe yanıt ver. Metin Markdown formatında olsun (örneğin başlıklar için ##, bold yerler için ** vs. kullan).
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "Satış metni oluşturulamadı.";
  } catch (error) {
    console.error("Gemini Fetch Error:", error);
    return "Yapay zeka şu anda meşgul veya API bağlantısı başarısız, lütfen daha sonra tekrar deneyin.";
  }
}
