# Visa Navigator — One-pager (2026-09-01)

## Problem

Avrupa'ya çalışmak için bakan biri "hangi izin route'larına uygunum, neyim
eksik" sorusuna güvenilir cevap bulamıyor. Resmî kaynaklar dağınık, dilleri
karışık ve eşik değerleri her yıl değişiyor; ticari araçların çoğu lead-gen
(hesaplayıcı bahane, satış asıl), en iyileri bile ya sayfa-düzeyi tarihleme
(VisaMind — ve AB kapsamı yok) ya kapalı+ücretli provenance (WhereToEmigrate)
sunuyor. **Değer başına** "bu sayı şu resmî sayfadan, şu tarihte, şu alıntıyla"
diyen yok; kural değişince kullanıcı bunu fark edemiyor.

## Kullanıcı

AB dışından DE/FR/ES/NL'ye bakan bilgi işçisi — teklifi olan ya da olmak üzere
olan. İlk kullanıcı: proje sahibi. Vatandaşlıkla sınırlama yok: herkes genel
"3. ülke" hattından doğru cevap alır; vatandaşlığa özel hükümler (TR anlaşma
hükümleri, DE ayrıcalıklı erişim listesi) additive istisna verisi. Arayüz EN.

## Ürün

Çoktan seçmeli sorular (hedef 6-7 — A10, dilimle doğrulanacak) → hangi
route'ların kriterleri karşılanmış göründüğü +
**gap analizi** ("Blue Card eşiğine €4.000 var; meslek shortage listesindeyse
alt eşik geçerli"). Uygunluğu kod hesaplar (LLM değil); her değer resmî
kaynak URL + birebir alıntı + alınma tarihi taşır. Çıktı dili kategorik:
"uygunsun" asla — "eşik X, beyanın Y" + IRCC-tarzı disclaimer (hukuki koşul,
bkz. A1/Smartlaw). Çoktan-seçmeliye sığmayan kriterler (ör. diploma
denkliği/tanınma — Anabin) beyanla sorulur ("tanınıyor / tanınmıyor /
bilmiyorum"); araç denklik kararı vermez, resmî denklik kaynağına yönlendirir
ve "bilmiyorum" cevabını gap analizinde açık eksik olarak gösterir (A15).
Kişisel veri makineden çıkmaz: statik site, engine tarayıcıda, backend yok.

## Konumlanma (research-01'e karşı)

**"Değer başına tarih + birebir resmî alıntı taşıyan açık AB-çalışma-izni
kural veri seti"** — bu kombinasyon boş. WhereToEmigrate provenance yayınlıyor
ama kapalı+ücretli+200 ülkeye yayılmış; VisaMind per-widget tarih basıyor ama
yalnız US/CA/UK/AU; Visaora/Workbeyond blanket-tarihli; GitHub'da yeni oyuncu
yok (10 arama, 2026-09-01). Talep kanıtı: run-abroad 3 haftada 491★,
awesome-immigration 1.491★. Dağıtım: önce açık veri + GitHub/HN (SERP baş
terimleri lead-gen duvarı, ilk yıl beklenti yok); SEO uzun kuyruk ikinci kanal
(kurallardan otomatik üretilen mikro-sayfalar). Ürün "araç", satış değil
kaynak gösterme; JobRadar ile çapraz yönlendirme sonraki dönem.

## Kapsam

- **v1:** DE/FR/ES/NL, istihdam-temelli route'lar, ülke başı 8-10 (~35-40
  toplam; FR "talent" tek aile + alt-tip ayrıştırıcı sayılarak), ülke başı
  yazılı hariç-tutma listesi (mevsimlik/stajyer/denizci/sanatçı/yatırımcı).
  Tek kişilik yan proje: ilk dolum ≈ yüzü aşkın kaynaklı veri (route × kriter ×
  URL+alıntı+tarih) — plan aşaması bunu dilimlere yayar (ülke ülke açılış).
- **Pipeline v1:** izle + hash/diff + bayrak (issue açar, insan alıntı+tarihle
  günceller). Kaynak seçimi bot-duvarına göre: NL ind.nl (ideal), FR
  service-public F16922, ES UGE PDF hash'i + kalıcı insan-okur katmanı.
  **DE'nin stabil değer-kaynağı açık problem** (make-it-in-germany bot-duvarlı,
  BA duyurusu yıllık-URL'li): plan aşamasında spike — adaylar: headless fetch,
  BA/BMI duyuru indeks sayfasını izlemek, ya da DE'yi de insan-okur katmanına
  almak. Tam otomasyon (LLM çıkarım + kod doğrulama) v1.x.
- **Dalga 2:** CA + AU (puan sistemleri). **Dalga 3:** diğer Avrupa
  (topluluk + pipeline). **ABD:** ayrı karar, ayrı route tipi (kura determinizmi
  kırar).
- **Yapı:** iki repo — `visa-rules` (şema+dataset+engine+pipeline; dataset
  CC-BY-4.0, kod MIT, TS+JSON Schema) + `visa-navigator` (Astro statik site).
  LLM yalnız build-time soru-ifadesi cilası; runtime RAG yok ("route'a soru
  sor" v1.x backlog).

## Viability (Product gereği; orta back-edge 2026-09-02, kararlar insan kapısından)

- **Kitle (mertebe, grounded):** Yalnız Almanya'da 2023'te **41.000+ ilk Blue
  Card** verildi; dönem sonunda ~113.500 aktif taşıyıcı (BAMF istatistik
  sayfası, 2026-09-02 okundu). Blue Card, modellediğimiz 8 DE route'undan
  yalnız biri; dört hedef ülke ve tüm istihdam route'larıyla adreslenebilir
  kitle **yılda yüz binlerce başvuran** mertebesi (*bu genişletme çıkarımdır*,
  çapa sayı yalnız DE Blue Card).
- **Para:** Şeffaf **affiliate** (kullanıcının route'u için mecburi hizmetler:
  Sperrkonto, vize sigortası, dil — "affiliate" etiketli, çok sağlayıcılı,
  disclosure disclaimer'ın yanında) + **GitHub Sponsors** ilk günden.
  İzlemesiz reklam yalnız 25-50k ziyaret/ay eşiğinde yeniden değerlendirilir;
  AdSense/izlemeli ağ hiç (danışman reklamı + izleme, konum ve gizlilik
  çizgilerini bozar). Affiliate entegrasyonu v1.x dilimi — v1'i geciktirmez,
  gelir v1 sonrası başlar. **Sınır:** affiliate linkleri uygunluk sonucunu
  asla etkilemez (karar kodda, linkler sonuçtan sonra) ve hiçbir kişisel veri
  taşımaz (düz çıkış linki).
- **Başarı metriği (birincil):** **Dataset canlılığı** — resmî değişikliğin
  dataset'e işlenme süresi hedefi **≤48 saat** (izleme dilimi s4'ten itibaren
  ölçülür; öncesinde elle nokta kontrolü) + kapsam: v1'de 4 ülke, ~35-40
  route, %100 alıntı+tarihli. İkincil: organik kullanım (veri-toplamayan
  sayaç kurulunca). *Tek-küratör riski (A13):* tatil/yoğunlukta ≤48s "en iyi
  çaba"ya düşer; ihlal gizlenmez — her değerin okunma tarihi zaten kamuya
  açık, gecikme sayfada görünür.
- **Hedefler (insanın temposu):** **v1 ≈ 1 hafta** (kalan dilimler: gap
  analizi, izleme+bayrak, FR/ES/NL dolumu, açılış — kayma riski s5
  küratörlüğünde; kayarsa ülke ülke açılır, FR önce). **Dalga 2 (CA+AU) ≈ +2
  hafta.** 6-12 ay ufku: canlılık sözü ölçülür biçimde tutuluyor, dalga 2-3
  yayında; dış katkı hedef değil yan ürün.

## Harvest

WhereToEmigrate'in bayatlık-ceza modeli (doğrulama yaşı şemada birinci sınıf) ·
VisaMind'ın "Fetched <tarih>; view official table" UI deseni (per-value'ya
itilmiş hali) · IRCC+relokate disclaimer metinleri · PathWise rule-pack
sözlüğü + kapsam katmanları (fully modeled / partial / source-captured-only) ·
Workbeyond per-route sayfa şekli · awesome-immigration route envanteri
(tarama kaynağı).

## Varsayımlar

`docs/spine/assumptions.md` (A1-A15; research durumlarıyla). Dilimle
doğrulanacak en kritikler: A9 (gap analizi değeri), A10 (6-7 soru yeter),
A13 (izle+bayrak solo sürdürülebilir), A15 (kriterler beyanla ifade
edilebilir).
