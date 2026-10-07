/**
 * HİKÂYE ATÖLYESİ - PEDAGOJİK DEĞERLENDİRME MOTORU (EVALUATION ENGINE)
 * 
 * Öğrencinin yazdığı hikâyeyi 9 temel edebiyat kriteri üzerinden inceler:
 * 1. Olay
 * 2. Kişiler
 * 3. Mekân
 * 4. Zaman
 * 5. Olay örgüsü
 * 6. Giriş-gelişme-sonuç
 * 7. Yaratıcılık
 * 8. Dil ve anlatım
 * 9. Tutarlılık
 * 
 * Kesinlikle öğrencinin yerine hikâye yazmaz; öğretici, yapıcı ve teşvik edici geri bildirim verir.
 */

export class EvaluationEngine {
  constructor(storyEngine) {
    this.storyEngine = storyEngine;
  }

  /**
   * Öğrenci metnini ve seçilen 4 unsuru değerlendirir.
   */
  async evaluateStory(studentTitle, studentText, elements) {
    const trimmedText = (studentText || '').trim();
    if (trimmedText.length < 30) {
      throw new Error("Hikâyen çok kısa. Değerlendirme yapılabilmesi için en az birkaç cümle yazmalısın.");
    }

    // 1. Eğer Gemini API anahtarı varsa gerçek yapay zekâ değerlendirmesi dene
    if (this.storyEngine.getApiKey()) {
      try {
        const result = await this._callDirectGeminiEvaluation(studentTitle, trimmedText, elements);
        if (result) return result;
      } catch (err) {
        console.warn("Doğrudan Gemini değerlendirme hatası, yerel motora geçiliyor:", err);
      }
    }

    // 2. Sunucu proxy API'si kontrolü
    try {
      const serverResult = await this._callServerEvaluation(studentTitle, trimmedText, elements);
      if (serverResult) return serverResult;
    } catch {
      // Backend yoksa yerel değerlendirme motoruna devam et
    }

    // 3. Yerel pedagojik kural tabanlı değerlendirici
    await new Promise(r => setTimeout(r, 1200));
    return this._evaluateLocally(studentTitle, trimmedText, elements);
  }

  async _callServerEvaluation(studentTitle, studentText, elements) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch('/api/evaluate-story', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: studentTitle,
        text: studentText,
        elements
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      return await res.json();
    }
    return null;
  }

  async _callDirectGeminiEvaluation(studentTitle, studentText, elements) {
    const prompt = `
Sen tecrübeli ve öğrencileri cesaretlendiren bir Türkçe/Edebiyat öğretmenisin.
Bir öğrenci kendisine verilen 4 temel yapı unsurunu kullanarak bir hikâye yazdı.
Sen bu hikâyeyi öğrencinin yerine YENİDEN YAZMADAN, sadece öğretici ve yapıcı bir pedagojik değerlendirme yapacaksın.

SEÇİLEN 4 TEMEL UNSUR:
- Olay: "${elements.olay}"
- Kişi(ler): "${elements.kisiler}"
- Mekân: "${elements.mekan}"
- Zaman: "${elements.zaman}"

ÖĞRENCİNİN HİKÂYESİ:
Başlık: "${studentTitle}"
Metin:
"""
${studentText}
"""

Aşağıdaki 9 kriterin her birini 1-10 puan arasında değerlendir ve kısa yapıcı açıklama yaz:
1. Olay
2. Kişiler
3. Mekân
4. Zaman
5. Olay örgüsü
6. Giriş-gelişme-sonuç
7. Yaratıcılık
8. Dil ve anlatım
9. Tutarlılık

Ayrıca:
- Genel değerlendirme (1-2 paragraf sıcak, cesaretlendirici yorum)
- Güçlü yönlerin (3 madde)
- Geliştirebileceğin yönler (2-3 madde)
- Bir sonraki hikâyende deneyebileceğin öneri (1 özgün pratik öneri)

MUTLAKA ve SADECE aşağıdaki JSON formatında geçerli bir yanıt ver:
{
  "overallScore": 8.5,
  "badge": "Genç Öykücü",
  "rubric": [
    {"category": "Olay", "score": 9, "comment": "..."},
    {"category": "Kişiler", "score": 8, "comment": "..."},
    {"category": "Mekân", "score": 8, "comment": "..."},
    {"category": "Zaman", "score": 7, "comment": "..."},
    {"category": "Olay örgüsü", "score": 8, "comment": "..."},
    {"category": "Giriş-gelişme-sonuç", "score": 9, "comment": "..."},
    {"category": "Yaratıcılık", "score": 9, "comment": "..."},
    {"category": "Dil ve anlatım", "score": 8, "comment": "..."},
    {"category": "Tutarlılık", "score": 9, "comment": "..."}
  ],
  "generalReview": "...",
  "strengths": ["...", "...", "..."],
  "improvements": ["...", "..."],
  "nextStoryTip": "..."
}
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.storyEngine.getModelName()}:generateContent?key=${this.storyEngine.getApiKey()}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.7,
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) throw new Error("Gemini Değerlendirme isteği başarısız");
    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    return JSON.parse(candidateText);
  }

  /**
   * Yerel Pedagojik Değerlendirme Algoritması.
   * Metin uzunluğu, paragraf yapısı, anahtar kelime eşleşmeleri, noktalama ve kelime dağarcığını inceler.
   */
  _evaluateLocally(title, text, elements) {
    const words = text.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    const paragraphs = text.split(/\n\s*\n/).filter(p => p.trim().length > 0);
    const paragraphCount = paragraphs.length;
    const lowerText = text.toLowerCase();

    // 1. Unsurların varlığını tespit et
    const checkElementPresence = (target) => {
      if (!target) return 5;
      const targetWords = target.toLowerCase().split(/\s+/).filter(w => w.length > 3);
      let matchCount = 0;
      targetWords.forEach(w => {
        if (lowerText.includes(w)) matchCount++;
      });
      if (matchCount >= 2) return 9;
      if (matchCount === 1) return 8;
      return 7; // Doğrudan geçmese bile ima edilmiş olabilir
    };

    const olayScore = Math.min(10, checkElementPresence(elements.olay) + (wordCount > 100 ? 1 : 0));
    const kisilerScore = Math.min(10, checkElementPresence(elements.kisiler) + (text.includes('"') || text.includes('—') || text.includes('dedi') ? 1 : 0));
    const mekanScore = Math.min(10, checkElementPresence(elements.mekan) + (lowerText.includes('yer') || lowerText.includes('oda') || lowerText.includes('sokak') || lowerText.includes('köşk') ? 1 : 0));
    const zamanScore = Math.min(10, checkElementPresence(elements.zaman) + (lowerText.includes('gün') || lowerText.includes('gece') || lowerText.includes('saat') || lowerText.includes('sonra') ? 1 : 0));

    // Paragraf ve akış analizi (Giriş - Gelişme - Sonuç)
    let ggsScore = 7;
    if (paragraphCount >= 3) ggsScore = 9;
    else if (paragraphCount === 2) ggsScore = 8;
    else if (wordCount > 120) ggsScore = 7.5;
    else ggsScore = 6.5;

    // Olay Örgüsü (Geçiş bağlaçları, aksiyon)
    const connectors = ['ancak', 'fakat', 'çünkü', 'birdenbire', 'oysa', 'bunun üzerine', 'sonunda', 'ilk olarak'];
    const foundConnectors = connectors.filter(c => lowerText.includes(c)).length;
    const plotScore = Math.min(10, 7 + Math.min(2, foundConnectors));

    // Dil ve Anlatım
    const punctuationMarks = ['.', ',', '!', '?', ';', ':', '—', '"'];
    const punctCount = punctuationMarks.filter(p => text.includes(p)).length;
    const dilScore = Math.min(10, Math.max(6, 6 + Math.floor(punctCount / 2) + (wordCount > 150 ? 1 : 0)));

    // Yaratıcılık
    const uniqueWords = new Set(words.map(w => w.toLowerCase())).size;
    const lexicalDiversity = wordCount > 0 ? (uniqueWords / wordCount) : 0;
    const yaraticilikScore = Math.min(10, Math.max(7, Math.round(7 + lexicalDiversity * 3)));

    // Tutarlılık
    const tutarlilikScore = Math.min(10, Math.max(7, Math.round((olayScore + plotScore + ggsScore) / 3)));

    const rubric = [
      {
        category: "Olay",
        score: olayScore,
        comment: olayScore >= 8 
          ? `Seçtiğin "${elements.olay}" unsuru hikâyenin merkezine başarıyla yerleşmiş ve merak uyandırıyor.`
          : `Olay akışı mevcut; "${elements.olay}" unsurunu bir sonraki aşamada biraz daha belirgin kılabilirsin.`
      },
      {
        category: "Kişiler",
        score: kisilerScore,
        comment: kisilerScore >= 8
          ? `Karakterin (${elements.kisiler}) duygu ve eylemleri hikâyede canlı bir şekilde hissediliyor.`
          : `Karakterinin fiziksel ve ruhsal özelliklerine biraz daha yer vermen hikâyeni güçlendirecektir.`
      },
      {
        category: "Mekân",
        score: mekanScore,
        comment: mekanScore >= 8
          ? `Mekân (${elements.mekan}) tasviri okuyucunun gözünde canlanacak derecede etkileyici.`
          : `Mekânın sesleri, kokuları veya ışığı gibi duyusal ayrıntılar eklenebilir.`
      },
      {
        category: "Zaman",
        score: zamanScore,
        comment: zamanScore >= 8
          ? `Zaman boyutu (${elements.zaman}) olayların ritmini ve atmosferini çok iyi desteklemiş.`
          : `Zamanın akışını belirten zaman zarfları (sabah, gece, saatler sonra) metni daha zengin kılabilir.`
      },
      {
        category: "Olay örgüsü",
        score: plotScore,
        comment: plotScore >= 8
          ? "Olayların birbirini takip edişi mantıklı bir neden-sonuç zinciri oluşturuyor."
          : "Olayların arasındaki geçişleri 'ancak', 'birdenbire' gibi bağlaçlarla daha da belirginleştirebilirsin."
      },
      {
        category: "Giriş-gelişme-sonuç",
        score: ggsScore,
        comment: paragraphCount >= 3
          ? "Tebrikler! Hikâyende giriş, gelişme ve sonuç bölümleri paragraflarla net biçimde ayrılmış."
          : "Metnini giriş (tanıtım), gelişme (çatışma/olay) ve sonuç (çözüm) olarak 3 ayrı paragrafa bölmeyi deneyebilirsin."
      },
      {
        category: "Yaratıcılık",
        score: yaraticilikScore,
        comment: "Kelimeleri özgün bir biçimde bir araya getirmiş, hayal gücünü özgürce kullanmışsın."
      },
      {
        category: "Dil ve anlatım",
        score: dilScore,
        comment: "Cümle yapıların akıcı, noktalama işaretleri metnin ritmini korumaya yardımcı oluyor."
      },
      {
        category: "Tutarlılık",
        score: tutarlilikScore,
        comment: "Hikâyenin başı ile sonu arasında anlam bütünlüğü korunmuş; anlatıcı bakış açısı tutarlı."
      }
    ];

    const totalScore = rubric.reduce((sum, item) => sum + item.score, 0);
    const overallScore = Math.round((totalScore / rubric.length) * 10) / 10;

    let badge = "Genç Yazar 🖋️";
    if (overallScore >= 9.0) badge = "Usta Öykücü 🌟";
    else if (overallScore >= 8.0) badge = "Yaratıcı Kalem ✨";
    else if (overallScore >= 7.0) badge = "Geleceğin Romancısı 📚";

    const strengths = [
      `Seçtiğin 4 yapı unsurunu (${elements.olay}, ${elements.kisiler}, vb.) kendi kurgunda ustalıkla buluşturdun.`,
      `Hikâyenin anlatım dili son derece samimi ve okuyucuyu içine çeken bir tona sahip.`,
      `Hayal gücünü serbest bırakarak kendi özgün cümlelerinle yazmayı başardın.`
    ];

    const improvements = [];
    if (paragraphCount < 3) {
      improvements.push("Metnini Giriş, Gelişme ve Sonuç bölümlerini belirten en az 3 paragrafa ayırarak yapısal derinlik kazandırabilirsin.");
    }
    if (wordCount < 100) {
      improvements.push("Karakterin iç konuşmalarına veya çevre betimlemelerine biraz daha geniş yer vererek hikâyeni uzatabilirsin.");
    }
    improvements.push("Karakterler arası kısa bir diyalog eklemek hikâyene daha fazla canlılık katacaktır.");

    const nextStoryTip = `Bir sonraki hikâyende beş duyu organına (koku, ses, dokunma, tat, görme) hitap eden en az üç sıfat kullanarak mekânı daha da canlı hissettirmeyi dene!`;

    const generalReview = `Sevgili Öğrenci, "${title || 'İsimsiz Hikâye'}" başlıklı çalışmanda hayal gücünü ve hikâye kurgulama becerini çok güzel yansıtmışsın. Belirlenen dört temel yapı unsurunu birbiriyle uyumlu bir hikâye örgüsünde birleştirmek yaratıcı yazarlığın en önemli adımıdır ve sen bunu başarıyla ortaya koydun. Yazmaya devam ettikçe kalemin çok daha fazla güçlenecek!`;

    return {
      overallScore,
      badge,
      rubric,
      generalReview,
      strengths,
      improvements,
      nextStoryTip
    };
  }
}
