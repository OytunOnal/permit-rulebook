# Research 01 — Varsayım sınaması (2026-09-01)

Brainstorm Loop'un ilk research yarı-turu. Dört paralel ajan, A1-A8'i fetch
edilmiş kaynaklarla sınadı. Her satır **found** (sayfada görüldü) ya da
**inferred** (görülenden çıkarım) işaretli; fetch edilemeyenler "Unverified"
altında. Ajan raporlarının tamamı oturum kaydında; burada karara girenler var.

---

## Karar girdisi (decision input)

**Öneri: DEVAM** — konum revizyonlarıyla. Fikri öldürecek bulgu çıkmadı;
üç varsayım zayıfladı ama zayıflamış halleri hâlâ savunulabilir bir konum
tanımlıyor:

> **"Değer başına tarih + resmî kaynaktan birebir alıntı taşıyan, açık,
> AB-çalışma-izni kural veri seti"** — bu kombinasyonu kimse yapmıyor (A2
> zayıflamış hali + A7), yapılabilirliği tek kişilik bir repo kanıtlamış
> (PathWise), talep kanıtı güçlü (run-abroad: 3 haftada 491 yıldız), ve dağıtım
> kanalı SEO değil önce GitHub/HN (A8 revize).

Revizyonlar (one-pager'a girecek):
1. **Kapsam sayısı:** ülke başı 6-8 değil **8-12 route, toplam ~40** (A5);
   her ülke için yazılı **hariç tutma listesi** (mevsimlik, stajyer, denizci,
   sanatçı, yatırımcı) bir tasarım eseri olarak gerekli. FR "talent" ailesi tek
   route + alt-tip ayrıştırıcısı olarak modellenmeli (2024 reformu alt-tipleri
   birleştiriyor: kaynak aşağıda).
2. **Pipeline gerçeği:** 1 numaralı tehdit JS değil **bot-blocking** (A3).
   make-it-in-germany (Radware), france-visas + immigration.interieur (403)
   düz fetcher'ı engelliyor. Tasarım: ülke başına *izlenebilir* kaynak seçimi
   (NL: ind.nl, FR: service-public.gouv.fr F16922, DE: BAMF metin + yıllık
   değer duyurusu, ES: UGE PDF hash'i) + "değişti-bayrağı sonrası insan okur"
   katmanı. ES'te değerler glyph-encoded PDF'te → İspanya kalıcı olarak
   insan-okur katmanında.
3. **Şemaya çift atıf:** DE ve ES'te yasa **formül** verir (Beitragsbemessungs-
   grenze oranı; 1,4× INE ortalaması), euro değeri başka yerde duyurulur.
   Alan: `value_source` (duyuru) + `legal_basis` (yasa/madde).
4. **Çıktı dili hukuki tasarım gereğidir** (A1): "uygunsun" asla; "eşik X,
   beyanın Y" + IRCC-tarzı disclaimer. Serbest metin vaka girişi yok — bu
   RDG'nin "rechtliche Prüfung des Einzelfalls" çizgisinin dışında kalmanın
   koşulu.

---

## Varsayım kararları

### A1 — Hukuki konum → `research-confirmed` (koşullu)
- **found:** § 2 Abs. 1 RDG: "Rechtsdienstleistung ist jede Tätigkeit in
  konkreten fremden Angelegenheiten, sobald sie eine rechtliche Prüfung des
  Einzelfalls erfordert." (https://dejure.org/gesetze/RDG/2.html)
- **found:** BGH 09.09.2021 – I ZR 113/20 (Smartlaw): çoktan-seçmeli
  cevaplardan standart çıktı üreten yazılım RDG kapsamında *değil* — "feste
  Routine", kullanıcı "rechtliche Prüfung seines konkreten Falls" beklemiyor
  (https://www.lto.de/recht/juristen/b/bgh-izr11320-vertragsgenerator-smartlaw-legal-tech-keine-unzulaessige-rechtsdienstleistung-rdg-rechtsberatung).
- **found:** Alman devletinin kendi Quick-Check'i disclaimer taşımıyor; korunma
  tamamen ifade yumuşatması: "you have good chances", "You may be eligible"
  (https://www.make-it-in-germany.com/en/visa-residence/quick-check).
- **found:** IRCC şablonu (devşirilecek): "We won't make any immigration
  decision based on your answers. … They won't consider any result you get
  through this questionnaire in their decision."
  (https://ircc.canada.ca/english/helpcentre/answer.asp?qnum=010&top=4)
- **inferred:** Visa Navigator'ın mekanizması Smartlaw desenine oturuyor,
  hatta daha temiz (belge bile üretmiyor). Koşullar: kategorik çıktı dili,
  serbest metin vaka girişi yok, LLM/insan yorumu yok, IRCC-tarzı disclaimer.
- **Sınır:** FR/ES/NL için özgül araştırma yapılmadı — analoji. Smartlaw
  sözleşme belgesi hakkında, göç değil. Tam kanıt değil, destek.

### A2 — "Dar+canlı > geniş+bayat" → `research-confirmed` (zayıflamış halde)
- Güçlü hali ("rakipler tarih/kaynak hiç göstermiyor") **çürüdü**:
  - **found:** WhereToEmigrate methodology sayfası provenance log yayınlıyor:
    "Of the 12,275 individual visa-rule facts in our provenance log, 10,164
    (83%) are attributed to a statutory public agency" + bayatlık-ceza modeli
    ("6–12 months · −5", "12+ months · −15") (https://wheretoemigrate.io/methodology).
  - **found:** VisaMind sayfa-düzeyi tarih basıyor: "Fetched Jul 29, 2026"
    (https://www.visamind.com/en/united-states/tools/processing-time-tracker) —
    ama kapsamı yalnız US/CA/UK/AU.
- Zayıflamış hali **her yerde tuttu**: hiçbir rakip **değer-başına**
  tarih + kaynak URL + birebir alıntı çiftini vermiyor; Visaora hiç vermiyor
  ("No links to official government sources, retrieval dates, or last-updated
  timestamps", https://visaora.io/), Workbeyond sayfa-düzeyi "Updated Jun 2026".
- **Ayrıştırıcı daraldı ve netleşti:** per-value provenance × açık veri ×
  AB çalışma izinleri.

### A3 — Resmî sayfalar izlenebilir → kısmen; ülke-bazlı tablo (`research-confirmed` NL/FR, `research-refuted` ES-HTML, DE riskli)
| Ülke | Durum | Kanıt |
|---|---|---|
| NL | **En iyi.** Tek stabil EN HTML URL, tüm eşikler, tarihçeli | "€5,942.00" HSM 30+, ind.nl/en/required-amounts-income-requirements (**found**) |
| FR | Geçer — france-visas 403, ama service-public.gouv.fr F16922 tüm talent eşiklerini HTML taşıyor | "39 582 €", "59 373,00 € brut annuel" (**found**) |
| DE | Riskli — make-it-in-germany Radware bot-duvarı; BAMF temiz ama sayısız; değerler yıllık-URL'li BA bülteninde | "50.700 Euro" / "45.934,20 Euro" (arbeitsagentur.de newsletter 03-2026, **found**) |
| ES | HTML olarak kalır — değerler UGE PDF'inde, PDF metin katmanı makine-okunmaz (glyph-encoded) | BOE emri formül veriyor: "1,4 veces la ganancia media anual bruta" (https://www.boe.es/diario_boe/txt.php?id=BOE-A-2026-2142, **found**) |

### A4 — Kaynak dili engel değil → `research-confirmed` (ES kısmi)
- **found:** BAMF sayfası EN **ve TR** dahil 6 dilde; make-it-in-germany tam EN
  portal (insan için erişilebilir, bot için değil). FR: F16922 EN toggle'lı.
  NL: ind.nl/en tam portal. ES: UGE'nin EN HTML sayfaları var ama işlevsel
  belgeler İspanyolca PDF; make-it-in-germany-tarzı EN toplayıcı yok.

### A5 — Ülke başı 6-8 route → `research-refuted` (revize: 8-12, toplam ~40)
- **found:** DE 8-9 (BAMF kategorileri + Blue Card + Chancenkarte + job-seeker).
  ES 7-8. FR: talent ailesi ~8 varyant + 4 talent-dışı ≈ 12 (service-public
  N110; info-droits-etrangers.org; 2024 birleşme reformu). NL: IND resmî
  listesi **20** kayıt, ana istihdam ~10 (ind.nl/en/residence-permits/work).
- **inferred:** Patlama yok ama dürüst sayı ~40; hariç tutma listesi şart.

### A6 — CA/AU uyumu → `untested` (dalga 2, bu tur kapsam dışı)

### A7 — Açık dataset boşluğu duruyor → `research-confirmed`
- **found:** 10 GitHub/web araması; yeni oyuncu yok. En yakın: **PathWise**
  (https://github.com/SandeepMadhavarapu/PathWise, 1 yıldız) — "Every
  regulatory value … lives in a versioned rule pack carrying its authority,
  source URL and verification date" — ama alanı ABD öğrenci statüsü. Rakip
  değil; desenin tek kişiyle kurulabildiğinin kanıtı ve şema sözlüğü kaynağı.

### A8 — Statik site SEO'da yaşar → `research-refuted` baş-terimlerde, `research-confirmed` topluluk kanalında (revize)
- **found:** "blue card germany salary threshold 2026" sorgusunda dönen sonuçlar
  lead-gen/hukuk bürosu duvarı (jobbatical, savoryandpartners, aldaglegal...);
  resmî siteler yok. NL sorgusunda ind.nl yok, Big-4 var.
- **found:** run-abroad **491 yıldız, 12 Ağustos 2026'da açılmış** (~3 hafta)
  (https://api.github.com/repos/RadishXN/run-abroad); awesome-immigration
  **1.491 yıldız**; Visalist Show HN "565 points, 252 comments".
- **inferred (revize konum):** dağıtım = önce açık veri + GitHub/HN; SEO uzun
  kuyruk ikinci kanal; baş terimlerden ilk yıl beklenti sıfır.

---

## Harvest (devşirme listesi)

1. **WhereToEmigrate bayatlık-ceza modeli** → şemada doğrulama yaşı birinci
   sınıf alan; UI eski değeri sessizce sunmak yerine güveni düşürür.
2. **VisaMind'ın "Fetched <tarih>; <kurum> data updates monthly. View official
   table" satır deseni** → per-value versiyonuyla birebir kopyalanacak UI dili.
3. **IRCC + relokate disclaimer metinleri** → hazır şablon (research'te birebir
   alıntıları var).
4. **PathWise sözlüğü** → "versioned rule pack carrying its authority, source
   URL and verification date" + bilinmeyeni söyleme ("it says so when it
   doesn't know") + kapsam katmanları (fully modeled / partial /
   source-captured-only) — ES'nin insan-okur katmanı bu üçlüye oturuyor.
5. **Workbeyond per-visa sayfa yapısı** (eşik tablosu+ücret+süre+SSS) → tüketilebilir
   route sayfası şekli; farkımız hücre başına tarih+alıntı+kaynak.
6. **Visaora'nın mikro-sayfa SEO deseni** → kurallardan otomatik üretilen
   route/soru sayfaları (uzun kuyruk kanalı için).
7. **awesome-immigration** → route envanterinin ilk tarama kaynağı (rakip değil).

## Yeni bulgular (loop-until-dry girdisi)

Bu tur **yeni bulgu üretti** (bot-blocking, ES PDF sorunu, FR talent ailesi,
formül/değer ayrımı, SERP kompozisyonu) — kurala göre döngü kuru değil. Ancak
bulguların tümü *tasarım/plan düzeyi* kısıt; hiçbiri konsepti sorgulatan
türden değil ve hepsi one-pager + plan aşamalarında adreslenebilir. Skeleton
pace gereği döngü burada kapanıyor; ikinci research turu ihtiyacı doğarsa
(one-pager devils-advocate'i ya da plan aşaması kanıt gösterirse) back-edge
ile dönülür.

## Unverified (bu tur fetch edilemeyenler)

- gesetze-im-internet.de (ECONNREFUSED ×4) — §18g formül iddiası inferred.
- BGH I ZR 113/20 mahkeme metni (LTO üzerinden aktarıldı).
- ES güncel euro eşikleri (≈€41.356 / €33.085 — yalnız arama sonucu; resmî
  taşıyıcı okunamayan UGE PDF'i).
- WhereToEmigrate ücretli rapor içi per-value tarihleme (paywall).
- IAA practice note PDF (UK, hedef ülke değil).
- FR/ES/NL yetkisiz-hukuk-hizmeti kuralları (A1 analojiyle duruyor).
