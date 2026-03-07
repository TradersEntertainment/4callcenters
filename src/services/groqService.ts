import Groq from "groq-sdk";

// Browser usage requires dangerouslyAllowBrowser: true if calling from client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY || '',
  dangerouslyAllowBrowser: true
});

export async function generateSalesPitch(businessName: string, sector: string, city: string): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;

  if (!apiKey) {
    console.error("GROQ_API_KEY is missing!");
    return "Groq API Anahtarı eksik. Lütfen Vercel veya .env ayarlarınızı kontrol edin.";
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

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 1024,
      top_p: 1,
      stream: false,
    });

    return chatCompletion.choices[0]?.message?.content || "Satış metni oluşturulamadı.";
  } catch (error) {
    console.error("Groq Fetch Error:", error);
    // Fallback to a smaller model if the large one fails
    try {
      const fallback = await groq.chat.completions.create({
        messages: [{ role: "user", content: "Tekrar dene: " + businessName }],
        model: "llama3-8b-8192",
      });
      return fallback.choices[0]?.message?.content || "Bağlantı hatası.";
    } catch (e) {
      return "Groq API şu anda meşgul veya API anahtarı geçersiz, lütfen daha sonra tekrar deneyin.";
    }
  }
}
