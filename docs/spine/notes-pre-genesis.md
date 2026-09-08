Pre-Genesis design notes, 2026-08-26, Turkish, under the working name.
Kept as history, not maintained.

# Visa Navigator — fikir notları

> Durum: KONUŞULDU, başlanmadı. JobRadar bittikten sonra değerlendirilecek.
> Bu dosya 2026-08-26 tarihli tasarım konuşmasının kararlarını ve rekabet
> taramasını saklar. Kod yok, plan yok, karar var.

## Fikir

Kullanıcıya sorular soran, cevaplara göre **hangi çalışma/oturum izni
route'larına uygun olduğunu** gösteren araç. "Şunu yap" demez; "şu route'ların
kriterleri karşılanmış görünüyor, kaynak şu, eksiğin şu" der.

## Kararlar

**Ayrı uygulama.** JobRadar'ın içine girmeyecek. Gerekçeler: (a) deployment
şekli zıt — JobRadar local-first masaüstü, bu araç indekslenebilir public web;
(b) kitle farklı — buraya gelenin teklifi zaten olabilir, iş aramıyor olabilir;
(c) giriş noktası farklı (arama motorundan "blue card şartları" ile gelinir).

**Ama kural verisi ortak.** İki değil ÜÇ parça:
1. **rules engine + dataset** (bağımsız paket): route'lar, eşikler, kaynak
   linkleri, tarihler, uygunluk değerlendirme mantığı. Tek doğruluk kaynağı.
2. **visa navigator** (public web): engine üstünde soru akışı ve sonuç ekranı.
3. **JobRadar**: aynı paketi import eder, gerçek ilanlar üzerinde koşturur
   ("bu Münih ilanı bu maaşla eşiği geçiyor mu"). Offline olduğu için snapshot
   gömer, periyodik günceller.

**Dataset açık kaynak, ayrı repo.** Rekabet taramasının bulduğu boşluk tam bu:
ürün çok, açık veri yok. Şema netse Portekiz'deki biri Portekiz route'larını
ekler; kapsam sorunu topluluk sorununa dönüşür. Portfolyo değeri de daha
yüksek: "bir vize sitesi yaptım" değil, "Avrupa çalışma izni kurallarının
açık, tarihli, kaynaklı veri setini kurdum ve canlı tutuyorum".

## Mimari: yargı kodda, dil modelde

**Kod karar verir.** Uygunluk `if` ile hesaplanır, LLM'e sorulmaz.
Deterministik, test edilebilir, açıklanabilir.

**RAG kanıtlar.** Her kural resmî kaynağa bağlı; çıktı hep "şu sayfa şunu
diyor: [birebir alıntı], şu tarihte alındı" biçiminde.

**LLM sadece iki dar iş yapar:** serbest cevabı structured fact'e çevirmek ve
kodun verdiği sonucu insan diliyle açıklamak. Uygunluk kararında yeri yok.

## Soru akışı

**Sorular kurallardan türer.** Rule table'daki predicate'lerin referans verdiği
alanların birleşimi = sorulacak soru kümesi. Yeni ülke eklenince sorular
kendiliğinden belirir; soru seti kurallarla asla desenkron olmaz.

**Çoktan seçmeli.** Seçenekler kuralın kendi enum'undan gelir
(education: none | vocational | bachelor | master | phd).

**Sayısal alanlarda bant sorulur ve BANT SINIRLARI EŞİKLERİN KENDİSİDİR.**
Örnek: Blue Card eşiği €48.300, shortage-occupation eşiği €43.759 ise
seçenekler otomatik olarak "€43.759 altı / arası / üstü" olur. Eşik değişince
seçenekler de değişir. Elle bakım yok.

**Soru sırası information gain ile hesaplanır** — hangi cevap en çok route'u
eler, o önce sorulur. Vatandaşlık genelde ilk. Kullanıcı 40 değil 6-7 soruyla
sonuca varır.

## Çıktı: "uygunsun" değil, gap analizi

En değerli kısım eksiğin ne olduğu: "Chancenkarte puan tablosunda 6/6, geçtin"
ya da "Blue Card eşiğine 4 bin euro var, ama meslek shortage listesindeyse alt
eşik geçerli". Determinasyon değil bilgi; iddia küçük, fayda büyük.

## Canlı güncelleme: izle → tespit et → çıkar → doğrula → kapı → geçmiş

Elle güncelleme hedeflenmiyor, ama tam otomatik de tehlikeli (yanlış parse
edilen eşik herkesin uygunluğunu sessizce bozar). Akış:

- Resmî sayfaları periyodik çek, hash/diff ile anlamlı değişikliği tespit et
- Değişen bölümden yeni değeri LLM ile **alıntıyla birlikte** çıkar
- **Kod doğrular:** sayı mı, makul aralıkta mı, para birimi tutuyor mu, önceki
  değere göre sıçrama anormal mi
- Doğrulamadan geçmeyen değer canlıya ÇIKMAZ, bayrak açar
- Eski değer silinmez: "24 Ağu 2026'da €39.582'den €41.100'e değişti, kaynak
  alıntısı şu" — append-only audit trail

**Otomatikleşebilen:** sayısal eşikler, süreler, ücretler, shortage occupation
listeleri. **Otomatikleşemeyen:** yeni route doğması, kategori kaldırılması,
kural şemasının değişmesi. İkincisi için yapılabilecek en iyisi "bu sayfa
yapısal olarak değişti, şema gözden geçirilmeli" bayrağı.

## Kapsam ve risk

**Vize/oturum ÖNCE, vergi sonra ya da hiç.** Vize prosedürel ve kategorik,
RAG'in rahat ettiği metin. Vergi kişisel duruma bağlı (mukimlik, gelir türü,
çifte vergilendirme anlaşmaları, impatriés/Beckham gibi özel rejimler) ve
düzenlenmiş bir faaliyet — Almanya'da StBerG, Fransa'da consultation juridique.
Yapılacaksa "hangi rejimler var + resmî linke gönder" düzeyinde kalmalı.

**Advisor değil citation tool.** Kişiselleştirilmiş determinasyon yok,
kategorik kural + kaynak var. Kaynak yoksa cevap yok.

**v1'de 3-4 ülke.** Kullanıcının kendi hattı doğal başlangıç: Almanya,
Fransa, İspanya, Hollanda.

**Kişisel veri hassas** (vatandaşlık, maaş, diploma) → local-first / veri
saklamama konumlandırması JobRadar'ın "CV'n diskten çıkmaz" çizgisinin devamı.

**Cross-lingual retrieval:** kaynaklar FR/DE/ES, soru EN/TR.

## Rekabet taraması (2026-08-26)

**Ürün var, veri yok.** Yapılmış olanlar:

- **WhereToEmigrate.io** — en yakın rakip. "200+ ülke, 7.000+ resmî route,
  profil bazlı eşleşme", kendi indeksleri (Openness, Naturalisation Speed,
  Route Stability), "her rakam resmî kaynağa linkli". Ücretsiz araç + premium
  rapor + kural-değişikliği bülteni. **Zaafı: son güncelleme tarihi
  gösterilmiyor.**
- **VisaMind** — soru sorup uygun vizeleri match score ile listeliyor.
- **Visaora** — 100+ araç, Blue Card maaş hesaplayıcısı dahil.
- **Y-Axis, TerraTern** — göçmenlik danışmanlığı lead-gen araçları; hesaplayıcı
  bahane, satış asıl.
- **Global Sponsor Hub, Workbeyond** — "milliyet + rol + hedef ülke gir,
  kişiselleştirilmiş vize yolu al" (fikrin kaba versiyonu).

**GitHub'da kural motoru YOK.** Bulunanlar: `fillvisa-os` (ABD form doldurucu),
Visa Requirements API (199×199 ama **turist vizesi** verisi, çalışma izni
değil), USCIS Q&A üzerine fine-tune Llama'lar, çeşitli statik "visa navigator"
siteleri. Yapılandırılmış + kaynağa bağlı + canlı güncellenen açık bir çalışma
izni kural veri seti bulunamadı.

### İncelenen üç repo (kullanıcı buldu, 2026-08-26)

**[run-abroad](https://github.com/RadishXN/run-abroad) — 483 yıldız. EN ÖNEMLİSİ:
bu, fikrin çalışan bir prototipi.** 32 ülke/bölge, 71 route; kullanıcı 10 kriter
giriyor, motor route'ları dört kategoriye ayırıyor: uygun / az kaldı / uzun
hazırlık gerekir / şimdilik kapalı. Vanilla JS, sıfır bağımlılık, üç dosya;
veri `data.js` içinde JS objesi olarak. Çince arayüz, Çin'den göç eden kitleye
yönelik. 33 commit.
→ **Doğruladıkları:** (a) "az kaldı" kategorisi = senin gap analizi fikrinin ta
kendisi, demek ki en değerli kısım orası; (b) 71 route tek dosyaya sığıyor,
yani **veri seti ölçeği yönetilebilir**, korkulacak bir korpus değil;
(c) 483 yıldız = talep gerçek.
→ **Farkların:** verisi elle bakılıyor ve tarihsiz (canlı güncelleme, kaynak
alıntısı, audit trail yok) · 10 kriter sabit kodlanmış (senin soruların
kurallardan türeyecek) · Çince/Çin kitlesi (Avrupa + İngilizce/Türkçe alan boş)
· ilan havuzu bağlantısı yok.

**[awesome-immigration](https://github.com/AwesomeVisa/awesome-immigration) —
1.5k yıldız.** 8 kategoride 102 vize (digital nomad, entrepreneur, job seeker,
post-study, skilled migrant, working holiday...), ~18 ülke. Ama **markdown
link listesi**, yapılandırılmış veri değil; JSON/YAML yok, düz metin ve resmî
sayfa linkleri.
→ Rakip değil, **kaynak**: dataset'in ilk taramasında route envanteri olarak
kullanılabilir. Bir de kanıt: "yapılandırılmamış liste" 1.5k yıldız alıyorsa,
yapılandırılmış olanın karşılığı var.

**[orizn-visa-api](https://github.com/MattJeff/orizn-visa-api).** 199 pasaport ×
199 destinasyon = 39.585 çift, 15 dil, 136 resmî kaynak, REST + OpenAPI 3.0,
freemium (3k istek/ay ücretsiz). GitHub aktivitesi çok düşük (ticari API'nin
vitrin repo'su).
→ **Kapsam farklı: turist/seyahat vizesi** (visa-free, e-visa, visa on arrival),
çalışma izni uygunluğu değil. Yani rakip değil.
→ **Ama bir şeyi doğruluyor:** "her 2 haftada bir **otomatik değişiklik
tespitiyle** güncelleme" diyorlar — senin canlı-güncelleme yaklaşımın bu alanda
uygulanabilir ve ticari olarak da tercih edilen yol.

**Çıkarımlar:** (1) fikir yeni değil ama iyi yapılmamış, ortak zaaf tarihsizlik;
(2) asıl ayrıştırıcı rules engine değil, **gerçek ilanlar üzerinde koşması** —
kimsenin hem ilan havuzu hem kural motoru yok; (3) bu alan lead-gen sektörü,
SEO rekabeti sert ve niyet ticari → konumlanma "ürün" değil **araç**, satış
değil **kaynak gösterme** olmalı.

## Çapraz yönlendirme (ikisi de ürün olunca)

Vize aracı: "Almanya'da Blue Card'a uygunsun, eşik şu" → *"bu eşiği geçen
ilanları gör"* → JobRadar.
JobRadar: bir ilana bakarken → *"bu maaş ve ülke için hangi route?"* → vize
aracı. Aynı kişinin problemi, farklı anları.
