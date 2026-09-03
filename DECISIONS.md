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
4. **LLM rolü = build-time cila.** Soru kümesi/seçenekler/sıra koddan türer; LLM yalnız ifadeyi insanlaştırır, çıktı commit'lenir. Uygunluk kararı ve v1 sonuç metni deterministik. Runtime RAG yok; "route hakkında soru sor" (alıntı-temelli) v1.x backlog'una. → Graduated to ADR: `docs/adr/0001-eligibility-computed-by-code-never-llm.md`
5. **Pipeline v1 kesiti = izle + hash/diff + bayrak** (değişiklikte otomatik issue; insan alıntı+tarihle günceller). LLM'li çıkarım + kod doğrulama + otomatik PR = v1.x.
6. **Mimari: sıfır backend.** Statik site, engine tarayıcıda, pipeline dataset repo'sunun CI cron'unda; kişisel veri makineden çıkmaz. Ölçüm gerekirse veri-toplamayan sayaç sonradan. → Graduated to ADR: `docs/adr/0003-zero-backend-client-side-evaluation.md`
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
  → Graduated to ADR: `docs/adr/0002-per-value-provenance-enforced-by-schema.md`
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

---

## 2026-09-02 — s3b "Kaldıraç analizi" (insan sorusundan doğan mini dilim) 🛑→✅

**Doğum:** İnsan sorusu — "durumsuzlara hepsine 'not met: situation' diyoruz,
öneri veremiyoruz; ayrıca eksik olanı LLM mi söyleyecek?" **Cevap/karar:**
(1) "yakınlık" tahmin edilmez (falcılık) ama **kaldıraç** deterministik
hesaplanır: path-tipi alanlar (yeni `kind` ayrımı) alternatif değerleriyle
karşı-olgusal koşulur, met/near'a dönen route'lar "bu adım şunları açar" diye
listelenir; `is_fallback` seçenekleri (ör. "none") asla hedef olmaz — "teklifi
bırak" önerisi çıkamaz. (2) LLM sınırı yeniden teyit: eksik/gap her zaman
kodda hesaplanır; LLM'in gelecekteki rolü yalnız anlatım cilası + kaynak-temelli
soru-cevap (backlog'daki kararlar değişmedi). Senaryo+mock kapıyla onaylandı,
aynı gün real-green → **v0.4**. Dilim içi dürüstlük kuralı: karşı-olgusal
yalnız *mevcut cevaplarla karara bağlanabilen* route'ları listeler
(cevaplanmamış maaşla "Blue Card açılır" denmez). Hold satırlarına
kriter-bazlı "gereken: X · beyanın: Y" dökümü de bu turda eklendi (insan
bulgusu: açılan satır boştu). Commit'ler: `visa-rules@76255f4`,
`visa-navigator@c654fc5,e5b42ff`.

**Uzantı (insan sorusu, aynı gün) → v0.5:** "Neden yalnız situation? Dil
öğrenmesi, para biriktirmesi gerekenler?" — kaldıraç, eylemle değiştirilebilir
her alana genellendi (`kind: improvable`: dil, para, maaş, deneyim, denklik;
yaş/vatandaşlık attribute kalır — asla önerilmez). Yön filtresi bedava: düşüş
hiçbir route açmadığından satırı kendiliğinden yok. Tek-adım dürüstlüğü
korunur: cevaplanmamış alanlara yaslanan "açılır" iddiası yapılmaz (dilsiz
profile "A1 yeter" değil, ancak kanıtlanabilen "B2 → met" gösterildi;
tarayıcıda doğrulandı). Yan kazanım: `language_base` sorusu veri çelişkisi
üretebiliyordu ("hayır" + Almanca A2), kaldırıldı — taban-dil şartı §20a'daki
haliyle any(Almanca A1+ / İngilizce B2+) olarak dil seviyelerinden türüyor;
soru sayısı 15→14. Qualification bilinçli olarak improvable YAPILMADI
("üniversite bitir" önerisi kapsam dışı; ileride tartışılabilir). 43 test.
Commit'ler: `visa-rules@c5d2a49`, `visa-navigator@2b74eba`.

**İkinci uzantı (insan testi bulgusu, aynı gün):** Fon "€1.091 altı" cevabı
Chancenkarte'yi anında öldürüp görüşmeyi 3 soruda bitiriyordu — puanla
tutarsız. Kural düzeltildi: **sınırlı gap (bitişik para bandı, puan eksiği)
route'u öldürmez** — yalnız gap'siz "hard fail" öldürür; görüşme sürer, route
sonda "within reach — Gap: up to €1.091 — monthly funds" olur. Beklenmedik
güzel yan etki: info-gain, artık kimseyi elemediği için fon sorusunu geriye
attı. Gap notu alan-farkında oldu. 45 test; akış tarayıcıda doğrulandı.
→ Graduated (with the improvable-fail rule) to ADR:
`docs/adr/0004-bounded-gaps-keep-the-interview-alive.md`

---

## 2026-09-02 — Improvable-fail liveness + property-test suite (user-driven)

Third user-found behavior gap: a no-language explorer saw no language levers,
because the base-language hard fail killed Chancenkarte before funds/age were
asked, leaving nothing provable. Rule generalized: a failed criterion whose
referenced fields are ALL improvable is a closable shortfall — the interview
continues; only fixed-attribute/path fails (citizenship, qualification,
situation) end a route for real. Verified end-to-end in the browser with the
user's exact profile ("With German B2 → Chancenkarte met" now appears, with
the Anabin learn box on the open unknown).

In response to "were tests written for every possibility": added
`tests/properties.test.ts` — four invariants over 2,900 seeded-random
profiles: (1) interview terminates, never repeats; (2) status consistency
(met=all pass; near=only bounded-gap fails); (3) unlock rows are sound AND
complete single-step recommendations (no false promises, no missed levers,
never fallback/unknown targets); (4) once the interview ends, no unanswered
question can change any verdict. 51 tests total. Also saved a standing
feedback memory: pre-handover browser testing must include weak/edge
profiles, boundary values, and back/restart.

---

## 2026-09-02 — steward-3 skill update adopted (verified in skill files)

From here on, **everything written to disk is English** (docs, ledgers,
scenarios, decision entries), regardless of conversation language. Living
documents (STATUS, KANBAN, ARCHITECTURE) translated immediately; historical
entries and past scenarios stay as written — a backlog task covers migrating
the remaining Turkish docs (one-pager, assumptions, research-01, s1-s3b
scenarios). Scenario discipline tightened: every scenario carries at least
one weak/edge-profile line and names engine invariants with property-test
pointers; `tdd` + `code-review` are non-negotiable slice exits (skips need a
DECISIONS entry plus a compensating surface check). Deferral-fork rule noted:
s4 (the riskiest slice, deferred three boundaries) is being entered now
rather than deferred again.

---

## 2026-09-02 — s4 Part 0 spike: DE stable value source (resolved, no headless needed)

Live probe: the ZAV newsletter **index page**
(arbeitsagentur.de/…/newsletter-iss) is on a stable URL, plain-fetchable, and
lists all editions ("Ausgabe 01/2025 … 04/2026"). Decision: DE watch strategy =
(1) sentinel watch on the index — a new edition appearing raises a "new ZAV
edition, check thresholds" flag (human reads; ~quarterly); (2) content watch
on the known value pages (03-2026/blaue-karte, 04-2026/berufserfahrene), both
confirmed plain-fetchable. Candidates (c) headless and (d) human-tier not
needed for DE. gesetze-im-internet.de stays a human-tier reminder entry
(agents blocked, human reachable via VPN).

---

## 2026-09-02 — steward-3+4 additions adopted; remotes wired

Verified in the skill files: (1) target-project `CONTEXT.md` in the
domain-modeling format, retrofitted with the coined domain terms (route,
criterion, provenance, band, open unknown, met/within reach/not yet, bounded
gap vs hard fail, attribute/path/improvable, leverage step, watch
vocabulary); new terms land there at every slice exit. (2) ADR graduation:
four DECISIONS entries met all three criteria (hard to reverse, surprising
without context, real trade-off) and graduated to `docs/adr/0001–0004`; their
log lines now carry pointers. (3) Steward triage labels (`bug` /
`design-flaw` / `new-need`) created on both GitHub repos. (4) Remotes exist
(github.com/OytunOnal/visa-rules, /visa-navigator) — pushing to origin from
now on, per the human's instruction.

---

## 2026-09-02 — s5 boundary approved 🛑 (gate, human; three iterations)

"Four countries filled: FR·ES·NL" scenario + country-grouped mock approved
after three human-driven refinements at the boundary: (1) collapsible country
sections — hopeful countries open, all-not-yet collapsed with tallies;
(2) leverage preserved per country, rendered inside the owning country's
section, with collapsed-section tallies carrying an "unlocking step" hint so
a closed panel never hides hope; (3) unlock wording made conditional ("would
be met" / "would come within reach") — the human caught that "criteria met"
read as an achievement; fixed in the live v0.5 UI in the same commit. Design
decisions locked: destination question (attribute; single country skips other
countries' questions entirely), country-scoped fields, NL salaries stay
monthly with own bands, committed per-country exclusion lists. Real-green
requires the human VPN verification pass over FR/ES/NL sources.

---

## 2026-09-02 — s5 in-slice defaults (Spine chose; surfacing at this boundary)

Build decisions inside the approved s5 scenario, each reversible and logged:

1. **age_band split at 30** (u30 / 30–35 / 36–40 / over 40): NL HSM tiers
   break at 30; both under-35 options keep 2 Chancenkarte points (Anlage says
   under 35). One age question serves all four countries.
2. **Reduced thresholds not modeled** (NL HSM €3,122 / NL Blue Card €4,754 /
   ES Blue Card €33,085.09): each needs a "recent graduation" or
   shortage-catalogue field; noted in route summaries + exclusions.md,
   backlog for a later pass. ES SEPE catalogue URL still unverified.
3. **FR ICT resources floor rides the monthly-salary field** with an explicit
   note (fiche frames it as « justificatif de ressources », SMIC-indexed) —
   a separate resources question for one route wasn't worth the bloat.
4. **Unlocks qualifier fork**: a path-step counterfactual blocked ONLY by one
   unanswered attribute enum (situation_country for destination=all
   explorers) forks per option — rows read "a job offer in Spain"; both
   assumptions stated, every route fully proven. Plain rows keep the exact
   single-step oracle; qualifier rows got their own property-test oracle.
5. **deriveBands memoized per dataset** after the 4-country dataset pushed the
   property suite to 146s and broke vitest worker heartbeats; suite now 5.5s.
   thresholdsForField also walks nested any-paths (NL ICT thresholds).
6. **Watch slice hardening** (found live): buzer.de serves rotating ad
   variants per request — three page hashes, identical legal text. Watch
   entries can now hash only the region between two markers; a missing marker
   reports unreachable, never silent no-change. Buzer re-baselined sliced.
7. **Countries the destination rules out disappear from results** — their
   routes fail on a fact the user chose, which is not information. Single
   destination keeps the flat v0.5 layout; multi gets country sections.

---

## 2026-09-02 — s5 review round + the uppercase catch (human report)

Code review (visa-rules 891ed60^..HEAD, medium) returned 10 findings; 8 fixed,
1 mitigated (frozen bands + immutability contract), 1 promoted to backlog
(criterion-note provenance). The two that mattered most were both silent
product lies: (a) pooled band edges made German "within reach" verdicts depend
on which OTHER countries had nearby thresholds — bounded-gap semantics now
ignore adjacency entirely; (b) the qualifier fork admitted any attribute enum,
producing advice like "a job offer · under 30" — forks now require an explicit
is_qualifier mark in the dataset. schema_version bumped to 0.2.0 for the
band-id/option renames. Fixed in visa-rules@8757cc8.

Separately the human reported "why is everything uppercase and bigger?" on the
multi-country screen: the new country section reused class "country", which is
also the small uppercase chip on route cards — text-transform and
letter-spacing inherited into the whole section. Renamed to country-sec.
Verification workflow while the Chrome extension was down: headless-Chrome
screenshots via a dev-only ?dev-profile= hook (stripped from prod builds by
import.meta.env.DEV) — also how the destination-first scenario deviation was
caught on screen. astro check wired into the navigator build after it found a
real bug (failing any-criteria rendered "Not met: undefined").

---

## 2026-09-03 — steward-5 skill update adopted; product-critique golden set applied

Re-read genesis/product-critique/builder/researcher after the human's
"skills updated". New rules taken on: product-critique anchors (first
user-facing slice + v1 gate; light mode at other boundaries), builder agent
for slice implementation with review in the main session, everything on
disk in English (already the case). The human's own evaluation run left a
golden set of 10 live defects (`~/.claude/skills/spine/evaluate/golden/
visa-navigator-2026-09-03.md`); all 10 applied in this change, verified on
screen through a Chrome DevTools Protocol harness (device emulation at
390px — plain headless clamps windows to 500px, so earlier "phone" shots
were cropped desktop layouts; the probe reports zero overflow now):

- G1 responsive: single column for the whole flow at ≤760px, wrapping
  option buttons and section headers.
- G2 external links open in a new tab (same-tab + browser-back had wiped
  every answer).
- G3 "Change an answer" was a full reset — every answered row in the
  declaration panel is now an edit point that resumes the interview at that
  question with earlier answers intact; the link became "Start over".
- G4 "Somewhere else (third country)" → "Any other country"; question
  reframed as "Which passport will you apply with?" (dataset change).
- G5 record metaphor: deferred — print/export is an s6 launch item (noted in
  KANBAN), since the stamp/record framing is the design's signature.
- G6 the "Record generated" stamp now appears only with the results.
- G7 "the date it was read" → "the date we read it from the source".
- G8/G10 first screen names the outcome: work-permit routes (visa types),
  near-misses, the single unlocking step.
- G9 unlabeled ticks carry a hover title naming the amount and that it
  belongs to another route (full labels collide on narrow rails).

Cheap default, Spine chose: G5 deferral. Everything else reversible copy/UI.


---

## 2026-09-03 — product-critique "apply all" → slice s5b, built by the builder agent

The human picked all three Recommended Adjustments from the first
product-critique run (2 blockers, 5 friction, 5 polish; 29/40 on RUBRIC 1.1).
First slice run under the steward-5 split: specs and scenario written here
(judgment), implementation delegated to the `spine:builder` agent (test-first,
no gates, no ledger access), review back in the main session. The builder
returned 113 green tests, zero mocks born, and nine flagged deviations —
the value of the split showed up there: it refused to invent precondition
strings the dataset could not back, and it named three places where the spec
contradicted itself rather than papering over them.

**Design decisions this slice locks:**
1. **Notices are data, not UI copy** — a dataset-level provenanced statement
   with a `when` match, watched like any value (europa.eu, read 2026-09-03).
   The EU-passport screen is now the notice, not "0 routes look open".
2. **Preconditions are declared, not scored** — every route lists what the
   authority also requires but the interview never asks. "Criteria met" now
   means "on what you declared", visibly.
3. **hard_fail is a first-class result field** — one predicate decides route
   aliveness, learn boxes, auto-open and the unknown count, so the screen
   cannot contradict itself row by row.
4. **schema_version 0.3.0** — notices, preconditions, `period`,
   `short_reason`, and the `nl_grad3y` → `nl_recent_grad` + `top200_grad`
   split are breaking for stored profiles.

**Back-edge (evidence, not hunch):** the s5b scenario's step 4 said the German
group would read "7 routes need a job offer, transfer or hosting agreement".
The spec's own predicate (rows failing on path fields *only*) yields 5 — §18a
and §19c also fail on qualification and experience and keep their own rows —
and 5+3+4+4 = 16 is exactly the count the critique pinned. The scenario line
was my arithmetic slip; corrected in place with the measurement and this
record. The builder implemented the spec and flagged the mismatch instead of
bending either side: the exam stayed held-out.

**Review round (6 findings, all verified on the running page before fixing):**
a bounded gap propagated out of an `any` lost its field, so NL ICT rendered
"Gap: up to €2,490 — ." with no period and no rail — the very ambiguity the
slice set out to remove; the verdict line still promised "an open gap, not a
no" on hard-failed routes while three other places called it moot; the rail
label fix never fired (measured boxes still overlapped) — the second label now
drops to its own line, where no width can bring them back together; unlock
rows printed bare amounts; the group summary was fixed copy that told a user
who had declared a transfer that they needed one — it now derives the step
names from the dataset; the notice screen hardcoded the headline the notice
already carries. Cleanups taken with them: one field-lookup map instead of six
scans, one live-unknown list instead of three, one gap formatter instead of
three, single-pass partition, `forEachCriterion` exported so the page stops
re-implementing the criterion walk.

**Deferred, with reasons:** critique #11 (4.55:1 contrast on small mono text)
and #12 ("Up to 19 quick questions" — now 20 after the field split) are
tracker issues #1 and #2 under `design-flaw`; the report's own scope was
adjustments 1–3. The nl-ind-work-index sentinel flagged a change (unrelated
ECHR permit copy) — flag file kept for a human read, no dataset value rides
on it.

---

## 2026-09-03 — the daily watch fired on its own; two flags read

The GitHub Actions watch ran unattended at 09:54 UTC (visa-rules@05699f8) and
committed two flags, which is the liveness promise working without us. Read:

- **buzer-anlage-aufenthg (value-source): our own doing, not a source change.**
  The flag's diff context begins at the very first character of the sliced
  region, which is exactly where the s5-review marker widening moved the
  slice start ("Merkmal nach § 20b…" → "Tabelle Anlage hat…"). The statute
  table and "Die Mindestpunktzahl beträgt sechs Punkte." are byte-identical.
  Flag dropped, the widened baseline stands, and today's three independent
  runs agree on it. **Lesson recorded**: a slice-marker edit must be followed
  by `watch:sources --commit` in the same change, or the next run reports our
  edit as a source change — the watch cannot tell them apart.
- **nl-ind-work-index (sentinel): a real change, kept for a human.** IND's
  work index moved (diff context shows article-8 ECHR private-life copy).
  It backs no dataset value; the action is a skim for a new or renamed work
  route. Flag file left in `visa-rules/watch/flags/`.

Local work rebased onto the CI commit; state.json kept ours (12 snapshots
including the new europa.eu notice source — a superset of CI's 11, with the
same hashes for both changed entries).
