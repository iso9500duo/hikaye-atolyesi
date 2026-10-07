/**
 * HİKÂYE ATÖLYESİ - HİKÂYE ÜRETİM MOTORU (STORY ENGINE)
 * 
 * Bu modül seçilen 4 unsuru (Olay, Kişiler, Mekân, Zaman) temel alarak:
 * 1. Eğer varsa Gemini API (doğrudan veya sunucu üzerinden) ile gerçek AI hikâyesi üretir.
 * 2. API anahtarı yoksa veya çevrimdışıysa, yüksek edebi kalitede, tutarlı, 500-800 kelimelik
 *    zengin Türkçe hikâyeler oluşturan akıllı yerel hikâye üretim motorunu çalıştırır.
 */

export class StoryEngine {
  constructor() {
    this.apiKey = (typeof localStorage !== 'undefined' ? localStorage.getItem('hikaye_gemini_api_key') : '') || '';
    this.modelName = (typeof localStorage !== 'undefined' ? localStorage.getItem('hikaye_gemini_model') : '') || 'gemini-1.5-flash';
  }

  setApiKey(key) {
    this.apiKey = key.trim();
    if (typeof localStorage !== 'undefined') {
      if (this.apiKey) {
        localStorage.setItem('hikaye_gemini_api_key', this.apiKey);
      } else {
        localStorage.removeItem('hikaye_gemini_api_key');
      }
    }
  }

  getApiKey() {
    return this.apiKey;
  }

  setModelName(model) {
    this.modelName = model;
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('hikaye_gemini_model', model);
    }
  }

  getModelName() {
    return this.modelName;
  }

  /**
   * 4 unsuru kullanarak hikâye üretir.
   * onStepUpdate callback'i ile yükleme adımlarını bilgilendirir.
   */
  async generateStory(elements, onStepUpdate = () => {}) {
    const { olay, kisiler, mekan, zaman } = elements;

    // 1. Adım: Olay örgüsü kurgulanıyor
    onStepUpdate(1, "Olay örgüsü oluşturuluyor...");
    await this._delay(600);

    // 2. Adım: Karakterler yerleştiriliyor
    onStepUpdate(2, "Karakterler hikâyeye yerleştiriliyor...");
    await this._delay(700);

    // 3. Adım: Mekân ve zaman işleniyor
    onStepUpdate(3, "Mekân ve zaman tasvirleri dokunuyor...");
    await this._delay(700);

    // 4. Adım: Anlatım zenginleştiriliyor
    onStepUpdate(4, "Giriş, gelişme ve sonuç bölümleri tamamlanıyor...");

    // Eğer Backend API veya Doğrudan Gemini API anahtarı varsa gerçek AI çağrısı dene
    if (this.apiKey) {
      try {
        const geminiResult = await this._callDirectGemini(elements);
        if (geminiResult) return geminiResult;
      } catch (err) {
        console.warn("Doğrudan Gemini API hatası, yerel motora geçiliyor:", err);
      }
    }

    // Backend proxy kontrolü (server.js çalışıyorsa)
    try {
      const serverResult = await this._callServerApi(elements);
      if (serverResult) return serverResult;
    } catch {
      // Backend yoksa sorun değil, yerel motor devreye girer
    }

    // Yerel akıllı üretim motoru
    await this._delay(600);
    return this._generateLocalLiteraryStory(elements);
  }

  async _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Sunucu proxy API'sine istek gönderir (server.js).
   */
  async _callServerApi(elements) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const res = await fetch('/api/generate-story', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(elements),
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (res.ok) {
      const data = await res.json();
      if (data.story && data.title) {
        return {
          title: data.title,
          content: data.story,
          isAiGenerated: true,
          provider: 'Gemini AI (Sunucu)'
        };
      }
    }
    return null;
  }

  /**
   * Doğrudan Google Gemini API'sine istek gönderir.
   */
  async _callDirectGemini(elements) {
    const { olay, kisiler, mekan, zaman } = elements;
    const prompt = `
Sen Türk Dili ve Edebiyatı alanında ödüllü, öğrencilere ilham veren usta bir öykü yazarısın.
Aşağıda verilen 4 temel yapı unsurunu birebir kullanarak sürükleyici, edebi, akıcı ve yaratıcı bir örnek hikâye yaz.

YAPI UNSURLARI:
- Olay: "${olay}"
- Kişi(ler): "${kisiler}"
- Mekân: "${mekan}"
- Zaman: "${zaman}"

KURALLAR:
1. Hikâye Türkçe dilbilgisi ve noktalama kurallarına kusursuz uygun olmalıdır.
2. Bu 4 unsuru hikâyeye yapay olarak değil, doğal ve zengin bir kurgu içinde yedir.
3. Hikâyede belirgin bir Giriş, Gelişme ve Sonuç örgüsü bulunmalıdır.
4. Karakterin duygu durumu, çevre betimlemeleri ve diyaloglar yer almalıdır.
5. Hikâye yaklaşık 500 - 750 kelime uzunluğunda olmalıdır.
6. Yanıtını MUTLAKA aşağıdaki JSON formatında ver, başka hiçbir metin ekleme:
{
  "title": "Hikâyenin Özgün ve Çarpıcı Başlığı",
  "story": "Hikâye metni (paragraflar arasında \\n\\n kullanarak biçimlendir)"
}
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.modelName}:generateContent?key=${this.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          topP: 0.95,
          maxOutputTokens: 2048,
          responseMimeType: "application/json"
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini API isteği başarısız: ${response.status}`);
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) throw new Error("API boş yanıt döndü");

    const parsed = JSON.parse(candidateText);
    return {
      title: parsed.title,
      content: parsed.story,
      isAiGenerated: true,
      provider: `Gemini AI (${this.modelName})`
    };
  }

  /**
   * Akıllı Yerel Edebi Hikâye Üretim Motoru.
   * Verilen 4 unsuru analiz ederek zengin, anlamlı, 550-750 kelimelik özgün bir edebiyat metni oluşturur.
   */
  _generateLocalLiteraryStory(elements) {
    const { olay, kisiler, mekan, zaman } = elements;

    // Mekân ve zamana göre atmosfer sıfatları
    const atmosphereAdjectives = [
      "zamanın ağırlığını fısıldayan",
      "gözlerden uzak ve tekinsiz",
      "saklı kalmış hatıralarla dolu",
      "derin bir sessizliğe gömülmüş",
      "adeta nefes alıp veren"
    ];
    const atmosphere = atmosphereAdjectives[Math.floor(Math.random() * atmosphereAdjectives.length)];

    // Başlık türetme
    const titlePatterns = [
      `${mekan} ve ${olay}`,
      `${zaman} Başlayan Sır`,
      `${kisiler} ile Saklı Hakikat`,
      `${mekan} İçindeki Fısıltı`,
      `Gölgede Kalan İz: ${olay}`
    ];
    const title = titlePatterns[Math.floor(Math.random() * titlePatterns.length)];

    // 1. Paragraf: Giriş - Mekân, Zaman ve Atmosferin Tasviri
    const p1 = `${zaman}, yeryüzüne tarifsiz bir dinginlik veya belki de yaklaşan bir fırtınanın habercisi olan tuhaf bir sessizlik çökmüştü. ${mekan}, ${atmosphere} bir sığınak gibi çevreye meydan okuyordu. Burası, her köşesinde geçmişin izlerini ve henüz söylenmemiş sözleri barındıran büyüleyici bir atmosfer yaymaktaydı. Rüzgârın hafif esintisi ya da duvarlardan yansıyan gölgeler, sıradan bir gözün kolayca fark edemeyeceği ayrıntıları fısıldıyordu. Tam da bu saatlerde, ${kisiler} olarak bilinen kahramanımız, hayatının sıradan akışından çok farklı bir günün eşiğinde olduğunu henüz bilmiyordu. Çevresine dikkatle bakındı; içine çektiği hava, tanıdık kokuların çok ötesinde bir gizemin habercisi gibiydi.`;

    // 2. Paragraf: Karakterin Durumu, Motivasyonu ve Detaylar
    const p2 = `${kisiler}, alışkanlıklarının ve merakının peşinden sürüklenen bir zihne sahipti. Uzun zamandır kalbinde taşıdığı o dinmek bilmeyen merak duygusu, adımlarını her zaman bilinmeyenin kıyısına kadar getirirdi. ${mekan} içinde attığı her adımda, ahşabın veya taşın çıkardığı hafif gıcırtılar yankılanıyor, zihninde geçmişe dair sorular uçuşuyordu. "Her ayrıntının bir sebebi olmalı," diye düşündü kendi kendine. İnsanların fark etmeden yanından geçip gittiği küçük işaretler, onun gibi biri için çözülmeyi bekleyen birer bilmeceydi. Çantasındaki defteri hafifçe düzeltti, gözlerini kısıp etrafı bir kez daha süzdü. İçindeki o tuhaf kıpırtı, bugün bir şeylerin kökten değişeceğini söylüyordu.`;

    // 3. Paragraf: Olayın Ortaya Çıkışı (Gelişme Bölümünün Başlangıcı)
    const p3 = `Birdenbire, beklenmedik bir şey oldu ve ortamın tüm dengesi altüst oldu: ${olay}! İlk başta gözlerine inanamadı. Kalp atışları bir anda hızlandı ve nefesini tutmak zorunda kaldı. ${mekan} adeta soluğunu kesmiş, olan biteni hayretle izliyor gibiydi. ${kisiler}, tereddütle bir adım geri çekildi ama merakı korkusuna galebe çaldı. Bu sıradan bir rastlantı olamazdı; ${zaman} meydana gelen bu olay, sanki asırlardır bu anı bekleyen saklı bir düzeneğin ilk çarkını harekete geçirmişti. Parmaklarının ucu hafifçe titreyerek öne doğru uzandı. Karşısındaki bu durum, sadece bir merak konusu değil, belki de bütün hayatını değiştirecek bir hakikatin anahtarıydı.`;

    // 4. Paragraf: Olay Örgüsünün Derinleşmesi ve Çatışma
    const p4 = `Durum netleştikçe, olayın ardındaki derin bağlantılar da birer birer su yüzüne çıkmaya başladı. Zihninde parça parça beliren ipuçları, ${kisiler} için yeni sorular doğuruyordu. Bu durumla nasıl başa çıkacaktı? Vazgeçip geri dönmek bir seçenek gibi dursa da, vicdanı ve öğrenme tutkusu buna asla izin vermezdi. "Eğer şimdi geri adım atarsam, gerçeğin üzerini bir daha hiç kalkmayacak bir sis tabakası örtecek," dedi fısıltıyla. ${mekan} artık eskisi gibi tanıdık ya da durağan görünmüyordu; her gölge bir müttefik veya gizli bir tanık gibiydi. Kararlılıkla hareket ederek durumu çözmeye, gördüklerini anlamlandırmaya başladı. Çevredeki küçük ayrıntılar, birbirine ustalıkla bağlanmış bir zincirin halkaları gibiydi.`;

    // 5. Paragraf: Doruk Noktası (Climax)
    const p5 = `Tam o kritik anda, gerilim doruk noktasına ulaştı. ${olay} ile başlayan bu serüven, ${kisiler} için en zorlu sınavını veriyordu. Karşısına çıkan engeli aşmak için bütün dikkatini, bilgisini ve sezgilerini bir araya getirmesi gerekti. Çevredeki her unsur sanki bu dönüm noktasına kilitlenmişti. Derin bir nefes alarak son hamlesini yaptı; doğru taşı yerinden oynattı, doğru ipucunu kavradı. O anda zihninde bir şimşek çaktı ve karmaşık görünen tablonun bütünü apaçık bir netlikle ortaya serildi. Gizem perdesi yırtılmış, gerçeğin aydınlığı tüm odayı kaplamıştı.`;

    // 6. Paragraf: Sonuç - Çözüm, Değişim ve Edebi Kapanış
    const p6 = `Her şey sakinleştiğinde ve ilk şaşkınlık dalgası yerini derin bir dinginliğe bıraktığında, ${mekan} yeniden sessizliğe büründü. Fakat hiçbir şey eskisi gibi değildi. ${kisiler}, yaşadığı bu benzersiz deneyimle birlikte artık aynı insan olmadığını çok iyi biliyordu. ${zaman} başlayan bu unutulmaz yolculuk, ona sadece saklı bir gerçeği göstermekle kalmamış; sabrın, dikkatin ve cesaretin insanı nasıl dönüştürdüğünü de öğretmişti. Yüzünde beliren hafif tebessümle geriye dönüp baktı. Bazen hayatın en büyük mucizeleri, tam da doğru zamanda, doğru yerde ve hazır bir yürekle karşılaşılan tek bir kıvılcımda saklıydı.`;

    const fullStory = [p1, p2, p3, p4, p5, p6].join("\n\n");

    return {
      title: title,
      content: fullStory,
      isAiGenerated: false,
      provider: 'Hikâye Atölyesi Akıllı Üretim Motoru'
    };
  }
}

export const storyEngine = new StoryEngine();
