import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, this should be handled server-side
});

export async function generateSalesPitch(businessName: string, sector: string, city: string): Promise<string> {
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

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      model: "mixtral-8x7b-32768",
      temperature: 0.7,
      max_tokens: 1024,
    });

    return completion.choices[0]?.message?.content || "Satış metni oluşturulamadı.";
  } catch (error) {
    console.error("Groq API Error:", error);
    return "Yapay zeka şu anda meşgul, lütfen daha sonra tekrar deneyin.";
  }
}
