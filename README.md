# 📖 Hikâye Atölyesi – 4 Unsurla Hikâyeni Oluştur

Türkçe ve Türk Dili ve Edebiyatı dersleri kapsamında öğrencilerin hikâye yazma, kurgulama ve analitik düşünme becerilerini geliştirmek amacıyla tasarlanmış modern, etkileşimli ve eğitim odaklı bir web platformudur.

---

## 🎯 Projenin Amacı ve Pedagojik Vizyonu

Hikâye yazımında olay örgüsünün sağlam temellere oturması için 4 ana yapı unsuru gereklidir:
1. **⚡ Olay:** Hikâyeyi başlatan, geliştiren ve çatışmayı doğuran temel hadise.
2. **👤 Kişiler:** Hikâyedeki kahramanlar, karakterler ve onların özellikleri.
3. **📍 Mekân:** Olayın geçtiği fiziksel ve ruhsal çevre, atmosfer.
4. **⏳ Zaman:** Olayın meydana geldiği çağ, gün, mevsim veya an.

### 💡 Temel Eğitimsel Kural:
Bu uygulama, öğrencinin yerine ödev yapan bir araç **kesinlikle değildir**.
* **Yapay Zekâ Tarafından Üretilen Hikâye:** Öğrenciye yalnızca ilham veren, giriş-gelişme-sonuç bölümlerini ve unsurların nasıl harmanlandığını gösteren **"Örnek Model"** olarak sunulur.
* **Öğrencinin Kendi Hikâyesi:** Öğrenci aynı 4 unsuru kullanarak kendi özgün kurgusunu yazar.
* **Yapay Zekâ Değerlendirmesi:** Öğrencinin metnini yeniden yazmaz; 9 temel edebiyat kriterinde 10 üzerinden puanlayarak yapıcı, cesaretlendirici ve öğretici pedagojik geri bildirim verir.

---

## ✨ Öne Çıkan Özellikler

- **🎲 240+ Zengin Türkçe Seçenek Havuzu:**
  - En az 60 Olay
  - En az 60 Kişi
  - En az 60 Mekân
  - En az 60 Zaman
  *(Toplam 12 milyondan fazla benzersiz hikâye kombinasyonu! Her kategoride "Yeni seçenekler getir" butonu daha önce gösterilenleri hafızada tutarak tekrarları en aza indirir.)*
- **🎮 Oyunlaştırılmış Seçim Sistemi:**
  - 4 kartlı renk temalı arayüz (Turuncu, Mavi, Yeşil, Mor)
  - Seçim sayacı (Örn: `2 / 4 unsur seçildi`)
  - 4 unsur tamamlandığında konfeti kutlaması ve `🎉 Hikâyenin temelini oluşturdun!` bildirimi
- **⏳ 4 Aşamalı Animasyonlu AI Yükleme Ekranı:**
  - Olay örgüsü oluşturuluyor...
  - Karakterler hikâyeye yerleştiriliyor...
  - Mekân ve zaman işleniyor...
  - Giriş, gelişme ve sonuç tamamlanıyor...
- **📚 500-800 Kelimelik Akıcı Örnek Hikâye:**
  - 6 paragraflı edebi akış (Giriş tasviri, karakterin iç dünyası, olayın patlak verişi, derinleşen çatışma, doruk noktası ve anlamlı çözüm)
  - Sesli dinleme (Web Speech API ile Türkçe TTS okuma)
  - Kopyalama, TXT olarak indirme ve yazdırma desteği
- **✍️ Öğrenci Yazma Stüdyosu:**
  - Seçilen 4 unsurun ekranda sabitlenen hatırlatıcı rozetleri
  - Anlık kelime, karakter ve paragraf sayacı
  - Tarayıcı içi otomatik kaydetme (Auto-save) desteğiyle veri kaybı önleme
- **✅ Kendini Değerlendir (9 Maddelik Kontrol Listesi):**
  - Olayımı belirledim.
  - Hikâyemde karakterler bulunuyor.
  - Mekânı belirttim.
  - Zamanı belirttim.
  - Giriş bölümüm var.
  - Gelişme bölümüm var.
  - Sonuç bölümüm var.
  - Hikâyemde bir olay örgüsü oluşturdum.
  - Hikâyemi kendi cümlelerimle yazdım.
- **🤖 9 Kriterli Pedagojik AI Geri Bildirimi:**
  - Olay, Kişiler, Mekân, Zaman, Olay örgüsü, Giriş-gelişme-sonuç, Yaratıcılık, Dil ve anlatım, Tutarlılık (10 üzerinden puan ve açıklamalar)
  - Genel Değerlendirme
  - Güçlü Yönler (3 madde)
  - Geliştirilebilecek Yönler (2-3 madde)
  - Bir Sonraki Hikâye İçin Yaratıcı Yazarlık İpucu
  - Raporu TXT olarak indirme ve yazdırma imkânı
- **🔊 Web Audio API Ses Efektleri:**
  - Harici ses dosyası indirmeden çalışan hafif UI sesleri (seçim çıngırağı, kart yenileme akoru, tamamlama fanfarı) ve ses açma/kapama butonu
- **📱 %100 Duyarlı (Responsive) Tasarım:** Mobil, tablet ve masaüstünde kusursuz görünüm

---

## 🚀 Kurulum ve Çalıştırma

Uygulama **sıfır harici npm bağımlılığı** gerektirecek şekilde modern saf web teknolojileriyle (ES6 Modülleri, CSS3 ve yerleşik Node.js) tasarlanmıştır.

### 1. Yöntem: Node.js ile Çalıştırma (Önerilen)

Terminal veya PowerShell'de proje klasörüne gidin ve:

```bash
npm start
```
veya
```bash
node server.js
```

Tarayıcınızda açın:
👉 **`http://localhost:3000`** *(veya port doluysa otomatik belirlenen `http://localhost:3001`)*

### 2. Yöntem: Doğrudan Tarayıcıda Açma (Sunucusuz)

Herhangi bir kurulum yapmadan doğrudan `index.html` dosyasına çift tıklayarak modern bir tarayıcıda (Chrome, Edge, Firefox, Safari) açabilirsiniz.

---

## 🔑 Yapay Zekâ (Google Gemini) Entegrasyonu

Uygulama çift motorlu esnek bir mimariye sahiptir:

1. **Varsayılan Mod (API Anahtarsız):**
   - Herhangi bir API anahtarı girmenize **gerek yoktur**.
   - Sistem, Türkçe edebiyat kurallarına göre optimize edilmiş **akıllı yerel üretim ve analiz motoru** ile 500-800 kelimelik yüksek kaliteli örnek hikâyeler üretir ve 9 kriterli öğrenci metin değerlendirmesi yapar.

2. **Google Gemini API Modu (İsteğe Bağlı):**
   - **Frontend Ayarları Üzerinden:** Sağ üstteki `⚙️` ikonuna tıklayarak Gemini API anahtarınızı girebilir ve istediğiniz modeli (`gemini-1.5-flash`, `gemini-2.0-flash`, `gemini-1.5-pro`) seçebilirsiniz. Bu anahtar yalnızca sizin tarayıcınızın yerel hafızasında tutulur.
   - **Sunucu Üzerinden Güvenli Proxy:** Proje dizininde `.env` dosyası oluşturup içine:
     ```env
     GEMINI_API_KEY=senin_api_anahtarin
     GEMINI_MODEL=gemini-1.5-flash
     ```
     yazarak API anahtarını sunucu tarafında güvenle saklayabilirsiniz. Frontend kodunda anahtar asla açıkta bulunmaz.

---

## 📂 Proje Dizin Yapısı

```
HikayeYazma/
├── index.html              # Modern, semantik ana uygulama sayfası
├── styles.css              # Renk paleti, kartlar ve animasyon stil sistemi
├── server.js               # Sıfır bağımlılıklı Node.js HTTP sunucusu ve AI proxy
├── package.json            # Proje başlangıç yapılandırması
├── .env.example            # Güvenli ortam değişkenleri şablonu
├── README.md               # Kapsamlı dokümantasyon
└── js/
    ├── app.js              # Ana uygulama yöneticisi ve akış kontrolü
    ├── pools.js            # 4 kategori için 60'ar adetlik Türkçe veri havuzları
    ├── storyEngine.js      # Akıllı hikâye üretim motoru (Yerel + Gemini)
    ├── evaluationEngine.js # 9 kriterli pedagojik değerlendirme motoru
    ├── soundEffects.js     # Web Audio API ses efektleri ve Türkçe TTS seslendirme
    └── confetti.js         # Canvas tabanlı kutlama konfetisi
```

---

## 🎓 Millî Eğitim Bakanlığı (MEB) Müfredat Uyumu

Bu yazılım; Türkçe ve Türk Dili ve Edebiyatı derslerindeki şu kazanımları doğrudan destekler:
- *T.8.3.16. Metnin olay örgüsünü belirler.*
- *T.8.3.17. Metindeki hikâye unsurlarını (olay, kişi, mekân, zaman) belirler.*
- *T.8.4.6. Bir olay yazısı (hikâye) yazar.*
- *T.8.4.16. Yazdıklarını içerik, dil-anlatım ve yazım kuralları bakımından gözden geçirir ve öz değerlendirme yapar.*
