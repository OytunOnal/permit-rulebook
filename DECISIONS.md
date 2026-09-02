# DECISIONS — Visa Navigator

Append-only. Her giriş: tarih · karar · gerekçe · kapı mı (insan seçti) ucuz varsayılan mı (Spine seçti).

---

## 2026-09-01 — Scale Gate: seviye = Product 🛑 (kapı, insan seçti)

**Karar:** Proje Product seviyesinde yürütülecek (Sketch/Build değil).

**Gerekçe:** Dört sorunun üçü güçlü "evet":
- *Geri alması zor mu?* Kısmen — açık veri setinin şeması kamuya açılıp topluluk katkı aldığı an kamusal sözleşme olur; sonrası pahalı. Üç-parça mimari (rules engine paketi / navigator web / JobRadar importu) da kurulunca sınır taşımak maliyetli.
- *Başkası kullanacak mı?* Evet — indekslenebilir public web, arama motorundan gelen kullanıcı, topluluk katkısı beklenen açık dataset.
- *Para veya kişisel veri?* Para yok; kişisel veri var (vatandaşlık, maaş, diploma) ama local-first / veri saklamama konumlanmasıyla hafifletilmiş.
- *6 ay sonra yaşamalı mı?* Evet — "canlı, tarihli, kaynaklı veri seti" iddiası ürünün ayrıştırıcısı; izle→doğrula→audit-trail hattı ölü bırakılamaz.

Product sonucu: non-negotiable taban (structured log, hata görünürlüğü, secret hygiene, sınırda şema doğrulama, health sinyali, versiyonlu migration, veri dayanıklılığı kararı, lockfile+audit) walking skeleton'a baştan girer.

**Not:** NOTES.md (2026-08-26) bu karardan önceki tasarım konuşmasının ve rekabet taramasının kaydı; Brainstorm Loop'a girdi olarak alındı, sıfırdan tekrarlanmayacak.

---

## 2026-09-01 — Grill yarı-turu kararları (Brainstorm Loop, insan seçti)

Üç turluk grill'in bağladıkları:

1. **İlk kullanıcı = kullanıcının kendisi; kitle vatandaşlıkla sınırlanmaz.** Herkes genel "3. ülke" hattından doğru cevap alır; istisna küratörlüğü (TR + DE'nin ayrıcalıklı erişim listesi) v1'de, gerisi additive. Arayüz v1'de EN.
2. **Başarı ölçütü:** birincil = canlı/tarihli/kaynaklı açık dataset kalitesi (portfolyo), ikincil = organik kullanım. Topluluk katkısı hedef değil yan ürün.
3. **v1 kapsamı: DE/FR/ES/NL derin** (ülke başı 6-8 istihdam route'u). Dalga 2 = CA+AU (puan sistemleri modele tam uyar), dalga 3 = diğer Avrupa (pipeline+topluluk), **ABD = ayrı karar** (kura/işveren-süreci determinizmi kırar; girerse ayrı route tipiyle). Gerekçe: "canlı" sözü izlenen sayfa sayısıyla doğrusal maliyet; geniş+derin+canlı üçü birden v1'de tutulamaz (bkz. varsayım A2).
4. **LLM rolü = build-time cila.** Soru kümesi/seçenekler/sıra koddan türer; LLM yalnız ifadeyi insanlaştırır, çıktı commit'lenir. Uygunluk kararı ve v1 sonuç metni deterministik. Runtime RAG yok; "route hakkında soru sor" (alıntı-temelli) v1.x backlog'una.
5. **Pipeline v1 kesiti = izle + hash/diff + bayrak** (değişiklikte otomatik issue; insan alıntı+tarihle günceller). LLM'li çıkarım + kod doğrulama + otomatik PR = v1.x.
6. **Mimari: sıfır backend.** Statik site, engine tarayıcıda, pipeline dataset repo'sunun CI cron'unda; kişisel veri makineden çıkmaz. Ölçüm gerekirse veri-toplamayan sayaç sonradan.
7. **İki repo:** `visa-rules` (şema+dataset+engine+pipeline) + `visa-navigator` (statik site). Topluluk sözleşmesi olacak repo tarihçesini baştan kendi repo'sunda biriktirir.
8. **Lisans: dataset CC-BY-4.0, kod MIT.** Amaç yayılım+atıf, ticari engelleme değil.
9. **Stack: TypeScript + JSON dataset (JSON Schema sınır doğrulaması) + Astro.**

Varsayım listesi: `docs/spine/assumptions.md` (A1-A14).

---

## 2026-09-01 — Konsept kararı: DEVAM, 4 ülke 🛑 (kapı, insan seçti)

**Karar:** Brainstorm Loop kapandı; konsept devam ediyor, v1 = DE/FR/ES/NL.
Sunulan alternatifler: ES'yi dalga 2'ye itmek, pivot (önce yalnız dataset), dur.

**Gerekçe (research-01 bulgularıyla):**
- Boşluk duruyor ve keskinleşti: per-value tarih+alıntı × açık veri × AB
  çalışma izinleri kombinasyonunu kimse yapmıyor (A2 zayıflamış hali + A7).
- Talep kanıtı güçlü: run-abroad 3 haftada 491★; awesome-immigration 1.491★.
- Hukuki konum Smartlaw içtihadıyla destekli, koşullar tasarıma girdi (A1).
- Maliyet düzeltmeleri kabul edildi: ~40 route (A5 revize), bot-blocking'e
  dayanıklı kaynak seçimi + ES insan-okur katmanı (A3), dağıtım GitHub/HN
  önce (A8 revize).
- ES'nin v1'de kalma gerekçesi: insan-okur katmanı şeması ileride topluluk
  ülkeleri için zaten gerekli; erken kurulması şemayı dürüstleştirir.

**Loop-until-dry notu:** Tur yeni bulgu üretti (kural gereği döngü "kuru"
değil) ama bulguların tümü tasarım/plan düzeyi kısıt, konsept düzeyi değil;
skeleton pace gereği döngü tek turda kapatıldı. Gerekirse one-pager/plan
aşamasından kanıtlı back-edge ile dönülür.

---

## 2026-09-01 — One-pager onaylandı 🛑 (kapı, insan onayı)

**Karar:** `docs/spine/one-pager.md` delta onayıyla kabul edildi; Stage 3 kapandı.

**Süreç:** Devils-advocate 6 bulgu verdi (0 blocker, 4 risk, 2 nit); altısı da
düzeltilerek işlendi: (1) DE stabil değer-kaynağı açık problem + plan spike'ı,
(2) A15 eklendi (kriterler beyanla ifade edilebilir — denklik/Anabin sorunu),
(3) problem bölümü overclaim düzeltmesi, (4) "6-7 soru" hedef olarak
işaretlendi, (5) toplam ~35-40 route, (6) tek-kişi + ilk dolum yükü kapsama
girdi. İnsan delta'yı onayladı.

---

## 2026-09-01 — Tasarım yönü: "Damgalı Panel" (variant-d) 🛑 (kapı, insan seçti)

**Karar:** Çekirdek ekran (sonuç/gap-analizi) tasarımı variant-d — B'nin bilgi
mimarisi (hüküm-başlık, bitişik per-value kaynak, eşik rayı, beyan paneli) +
A'nın resmî-belge havası (serif başlık, kayıt mührü, çift-çizgi kurallar),
açık arşiv-kâğıdı zeminde. Tokenlar `tokens.css`'e çıkarıldı.

**Süreç:** İlk üçlü (A resmî-kayıt / B eşik-rayı / C sınır-artefaktı) kritik
edildi; insan "C'nin kartları + A'nın damga havası + B'nin netliği" melezi
istedi. İkinci üçlü (D damgalı-panel / E etiket-defteri / F sınır-kaydı)
üretildi; öneri F idi, insan D'yi seçti — kurumsal-güvenilir görünüm karakter
dozuna tercih edildi. Kritikte doğan kalıcı kurallar: eşik rayı her sayısal
kriterin standart modülü; gap kartı rayını mutlaka gösterir; "up to €X"
dürüstlüğü başlıkta da korunur; her kartta "Official page ↗" yönlendirmesi;
F'nin ülke-grubu başlıkları 40-route ölçeğinde D'ye taşınacak desen olarak
not edildi. Varyant dosyaları `docs/spine/design/`'da kalır (audit).

---

## 2026-09-01 — S1 dilim-içi kararlar (ucuz varsayılanlar, Spine seçti)

S1 real-green oldu; dilim içinde gate açılmadan verilen kararlar:

1. **`visa-rules` kardeş dizinde** (`Projects/visa-rules`) ayrı git repo —
   karar #7'nin fiziksel karşılığı; navigator ona `file:../visa-rules` ile
   bağlanır.
2. **Engine saf fonksiyon, veri ayrı export.** Navigator, `data/de.json`'u
   doğrudan import edip sınırda kendisi doğrular (`visa-rules/validate` ayrı
   entry — ajv client bundle'a sızmaz; client 9.5 kB).
3. **Astro 5 → 7 yükseltmesi**: `npm audit` Astro 5 hattında high-severity
   advisories gösterdi; v7.2.10'a geçildi, 0 zafiyet, build yeşil.
4. **Şema hata raporu "en derin instancePath"i seçer** — oneOf dallanması ilk
   hatayı yanıltıcı yapıyordu; artık `.../threshold must have required
   property 'quote'` gibi tam alan adlanıyor (senaryo adım 6 bunu istiyor).
5. **mattpocock zinciri kısaltıldı:** to-spec/tdd ayrı ayrı koşulmadı;
   testler implementasyonla birlikte yazıldı (16 vitest), senaryo tarayıcıda
   koşuldu. Gerekçe: dilim küçük, senaryo zaten spec. Sonraki dilimlerde
   büyüklüğe göre yeniden değerlendirilecek.
6. **Koşum sırasında yakalanan üç kopya hatası düzeltildi:** soru sayısı
   dinamik, gap notu yön göstermiyor ("check the other cards"), restart
   başlığı dinamik.
7. **A15 için erken sinyal:** kazara "I don't know" ile koşulan profil,
   "unknown = açık eksik, hayır değil" davranışını ekranda doğru gösterdi.

---

## 2026-09-02 — Soru budaması (insan testi bulgusu, dilim-sonrası düzeltme)

**Bulgu (insan, S1'i lokalde test ederken):** "Teklif var mı? → No" dedikten
sonra maaş sorusu geliyordu — ölü route için anlamsız soru.

**Karar:** Genel, veri-güdümlü budama eklendi (hardcode bağımlılık değil):
bir cevap bir route'un kriterini kesin düşürürse route ölür; hiçbir canlı
route'un referans vermediği soru atlanır (`remainingQuestions()`). "I don't
know" route'u öldürmez. Yan kural: hiç sorulmamış alan sonuç ekranında
"I don't know" gibi gösterilmez. AB vatandaşı seçilirse anket ilk sorudan
sonra biter. +5 test (toplam 21). Ayrıca footer/header çizgi genişliği
eşitlendi (insan bulgusu #2). Commit'ler: `visa-rules@98076da`,
`visa-navigator@98b78d4`.

**Not:** Bu, S2'nin (information gain) yarısını erkene çekti — S2 senaryosu
yazılırken budama artık mevcut sayılacak, S2 yalnız *sıralama*ya odaklanır.

---

## 2026-09-02 — Soru aşaması yerleşimi: iki kolon baştan 🛑 (kapı, insan seçti)

**Karar (yerleşim):** Soru aşaması da sonuç ekranıyla aynı iki kolonlu yerleşimi
kullanır: beyan defteri baştan solda ("—" bekleyen satırlar cevaplandıkça
dolar), soru kartı sağ ana kolonda. Sunulan alternatifler: kartı ortalamak
(sihirbaz hissi ama belge dilinden kopuş + geçişte zıplama), mevcut sola
yaslı hal, tek sayfa akan form (reddedildi — budamayla kötü etkileşir).
Gerekçe: boş alan "kaydın dolduğu" metaforuna dönüşür, soru→sonuç geçişinde
yerleşim zıplamaz. Ek: "Change an answer" yalnız sonuçta görünür; qcard'ın
38rem sınırı kalktı. Commit: `visa-navigator` (iki kolon + hidden CSS fix).

---

## 2026-09-02 — S2 dilim-içi kararlar (ucuz varsayılanlar, Spine seçti)

S2 mock-green; dilim içinde verilen kararlar:

1. **`in` ve `any` op'ları eklendi.** §20a'nın "Fachkraft ODER Punktzahl"
   ayrımı ve §19c'nin nitelikli-VEYA-IT yolu statünün gerçek yapısı;
   disjunction'ı düzleştirmek yerine şemaya alındı. `any` başarısız olurken
   en-yakın-yolun gap/puan bilgisini yukarı taşır (yoksa "2 puan eksik"
   hikâyesi hold'a düşüyordu — koşumda yakalandı).
2. **Puan kriteri erken-geçer ama erken-ölmez.** Ulaşılamaz duruma düşünce
   soruyu kesmek tam skoru ("4/6") gösterilemez kılıyordu; merdiven kısa
   (≤8 tık) ve her tık görünür skor ürettiğinden tamamlanana dek sorulur.
3. **"situation" alanı** (teklif / ICT-transfer / hosting / hiçbiri) üç ayrı
   evet-hayır sorusunu tek soruda katlıyor; ICT ve araştırmacının bileşik
   önkoşulları route notunda taşınıyor.
4. **Chancenkarte yalnız situation=none'da gösterilir** — kart "aramak" için
   var; teklifli kullanıcıyı 6+ puan-sorusuyla yormamak ürün kararı, gerekçe
   route notunda.
5. **§21 (öz-istihdam/serbest) v1 dışı** — kriterleri takdirî ("wirtschaftliches
   Interesse", finansman değerlendirmesi), deterministik kodlanamaz; DE
   hariç-tutma listesine gerekçesiyle yazıldı. Eski §20 iş-arama vizesi de
   yok (Chancenkarte'ye devrolmuş — küratör bulgusu).
6. **45+ yaş kuralları (55% eşiği, emeklilik karşılığı) kriter değil not** —
   koşullu/alternatifli yapı v1 modeline alınmadı; €55.770 değeri route
   notlarında anılıyor, kritere dönüştürülmesi backlog.
7. **Info-gain uniform önselle greedy** — "en çok eleyen soru önce"; bunun
   sonucu ilk soru citizenship değil situation (ort. 2.0 vs 4.0 canlı route).
   Gerçek kullanıcı dağılımı önseli (EU nadir) ileride veri alanı olabilir.
8. **Ray yalnız kartın kendi eşiğini etiketler** — yakın eşikler (€45.630 /
   €45.934,20) etiket çakıştırıyordu; diğer çentikler etiketsiz bağlam.
9. **A10 ölçümü:** teklifli yollar 6-7 soru ✓; puan yolu ~13 (assumptions'a
   işlendi).

Commit'ler: `visa-rules@58977ee,652628e`, `visa-navigator@a338f88`.

**Ek (insan geri bildirimi, aynı gün):** "You declared" defteri artık yalnız
sorulan alanları, soruluş sırasında gösterir — cevaplananlar birikir, yalnız
o anki soru bekleyen satır olarak eklenir. Gerekçe: adaptif budamayla 15
satırı baştan göstermek hiç sorulmayacak alanları vaat ediyordu; iki-kolon
kararının "boş satırlar dolar" detayı bu lehine terk edildi.
(`visa-navigator@a191702`)

---

## 2026-09-02 — S2 real-green + v0.1/v0.2 damgaları (insan doğrulaması)

**Karar/olay:** İnsan, S2 doğrulama listesinin tamamını resmî kaynaklardan
doğruladı — gesetze-im-internet.de'ye VPN ile erişti (ajanlara ECONNREFUSED
veren site insana açık; s4 pipeline kaynak-seçimi için önemli veri noktası).
S2 "Almanya tam seti" real-green; `## versions` defteri kuruldu: **v0.1**
Yürüyen iskelet (2026-09-01'e geriye dönük damga), **v0.2** Almanya tam seti.
Yan görev doğdu: buzer.de ayna URL'lerini resmî URL'lerle değiştirme
(backlog'da).

## 2026-09-02 — Steward-format defter güncellemeleri (skill güncellemesi, uygulandı)

Genesis/status skill'leri güncellenmiş (insan işaret etti, dosyalardan
doğrulandı). Uygulananlar: dilimler **yetenek adıyla** anılır (S-ID'ler yalnız
dosya adı); KANBAN mermaid dilim panosu + `## versions` defteri;
`docs/spine/ARCHITECTURE.md` (güven sınırı dahil mimari diyagram, her dilim
çıkışında güncellenir); Product seviyesinde one-pager'a **Viability** bölümü
şartı → **orta back-edge** açıldı (kanıt: skill güncellemesi + Product
gereksinimi; para/metrik/hedef kararları insana kapıyla sorulacak); yeni
ekran getiren dilimlerde senaryoyla birlikte statik mock onayı.

---

## 2026-09-02 — Viability onaylandı 🛑 (kapı, insan)

Kararlar insanın: **para** = şeffaf affiliate (mecburi hizmetler; etiketli,
çok sağlayıcılı, karara etkisiz) + GitHub Sponsors ilk günden; izlemesiz
reklam yalnız 25-50k/ay eşiğinde; AdSense hiç. **Metrik** = dataset
canlılığı (≤48s işleme + kapsam). **Hedef** = insanın temposu: v1 ≈ 1 hafta,
dalga 2 ≈ +2 hafta. Kitle çapası BAMF'tan temellendi (41.000+ ilk Blue Card
2023; genişletme çıkarım işaretli); kitle *tanımı* grill'deki haliyle insanca
teyit edildi. DA deltada 2 bulgu verdi, ikisi düzeltildi (tek-küratör riski
açık; affiliate sınırı açık).

## 2026-09-02 — s3 boundary onayı 🛑 (kapı, insan)

"Gap analizi sonuç ekranında" senaryosu (6 adım) + ekran mock'u
(`docs/spine/design/s3-results.html`: özet şeridi, OPEN/WITHIN REACH/NOT YET
grupları, kompakt hold satırları, veriden gelen "bilmiyorum → öğren" kutusu)
birlikte onaylandı. İlk turda insan ekranın bağlamını sordu; mock'un yalnız
sağ kolonu (değişen kısım) gösterdiği, "You declared" panelinin yerinde
kaldığı netleştirilip onay alındı.
