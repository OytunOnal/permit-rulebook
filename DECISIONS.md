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


---

## 2026-09-04 — the NL watch flag, read; and what it uncovered

Reading one sentinel flag properly turned into the most valuable hour of the
week. In order:

**1. The flag itself: benign.** The IND work index changed because one item
was added to the site-wide menu ("Residence permit under article 8 ECHR
private life"). Diffed old against new snapshot text: that line is the entire
change. The work inventory is intact — all five modelled info_urls still
resolve on the live index (no slug drift), and of the fifteen work routes we
do not model, fourteen were already named in `exclusions.md`; the fifteenth
("Recognition as sponsor" / "Employing a foreign national") is employer-side,
now recorded there too.

**2. The sentinel was too wide.** It hashed the whole page, so any edit to any
permit family anywhere on ind.nl woke it. Sliced to the Work block
(`Work Terug` … `Study Terug`, 2.6 kB of the 14.7 kB page) and re-baselined
**in the same change** — yesterday's lesson, applied. A sentinel that cries
wolf gets ignored, and this one guards the route inventory of a whole country.

**3. A second flag was waiting: europa.eu (value-source, backs the EU notice).**
Also benign — the page gained a "See also" block and moved its "Last checked"
date. The quoted sentence is untouched.

**4. Trying to prove point 3 exposed an encoding bug.** Every stored snapshot
of a non-ASCII page was double-encoded mojibake ("beträgt" → "betrÃ¤gt"),
caused by a PowerShell round-trip of `state.json` on 2026-09-02 (Get-Content
reads cp1252, Out-File writes UTF-8). **Change detection was never affected** —
hashes come from a fresh decode each run — but every flag's diff context was
unreadable for exactly the German, French and Spanish sources. Repaired all
ten html snapshots; a test now fails if mojibake reappears in state.

**5. And that exposed the real finding: five quotes were not quotes.** With
the text finally readable, an audit of every shipped quote against its source
showed two German ones were curator condensations ("kleine Blaue Karte EU:
45.934,20 Euro" appears nowhere on the ZAV page) and three Dutch ones were
reconstructed table rows using a "|" the page does not print. The numbers were
right and the human had verified them; the quotation marks around them were
the lie. All five replaced with spans extracted from the snapshots — never
retyped — and marked read 2026-09-04.

**The gate that makes it stick:** `checkQuotes` joins `checkCoverage` in
`npm run check`. Coverage says the source is watched; fidelity says the
sentence is still on it. It tolerates only our own tag-stripping artifacts (a
swallowed space in "45.630Euro", an added one in "EU ."), never different
words — a test pins both halves of that line. Today: 14 verified, 0 missing,
3 unverifiable by policy (the PDF tier a human must read). dataset_version
2026.09.04.


---

## 2026-09-04 — s5 human verification returned; 18/20 confirmed, and the misses were the valuable part

The held-out verification pass over `visa-rules/data/verify-s5.md` came back:
18 of 20 items confirmed against the live sources, 2 statements wrong, 8
findings the checklist never thought to ask for, 2 items left open. Acted on
in full; what needed a scope decision is a gate, not a silent choice.

**Corrected (the checklist was wrong, not the data):**
- The French exclusion reason claimed F16922 gives no per-subtype threshold
  for « entreprise innovante » and « salarié en mission ». It does, and both
  equal the salarié qualifié figure (€39,582) — what separates the subtypes is
  the employer/mission qualifier, not the money. `exclusions.md` now says so;
  modelling them is a scope question (below), no longer a data gap.
- The checklist quoted its own ES PDF hash wrong (…f543f609 → …053f4609).

**Fixed in the dataset (correctness, no scope change):**
- **The Blue Card's IT rule** — the highest-value finding. IND: "Are you an IT
  manager or IT professional? A minimum of 3 years of relevant work experience
  is required during the period of 7 years before the application." We modelled
  only the 5-year rule, so an IT professional with 3–5 years — the centre of
  our audience — was wrongly held. Modelled as a new field `experience_7y`
  referenced only by that route, so information-gain pruning asks it only when
  it can decide the Blue Card: a German applicant still answers 8 questions and
  never sees it. Verified: met with the 3-in-7 fact, honestly held without it.
- **The orientation year no longer asserts a rule its source does not state.**
  The "top 200 in 2 of 3 ranking publishers" mechanic is nowhere on the IND
  page (human check); the page frames foreign schools as "a designated foreign
  educational institution". Question relabelled to what is actually asked, the
  claim removed from the criterion note, and the English-proficiency
  requirement (IELTS 6.0 or equivalent) added as a stated precondition.
- Regulated professions are not an HSM speciality — the same requirement sits
  on the ICT route; precondition added there too.
- The researcher amount appears twice on the amounts page (once under "The
  sponsor is a single parent"), so its quote now carries the validity-window
  sentence that pins the right row.
- The Spanish threshold's derivation chain (INE average 29.540,26 € published
  28 May 2026 → Orden PJC/44/2026) is recorded on both ES routes: it says when
  the number will move, not just what it is.

**A structural finding: five of six IND route pages are invisible to us.**
Our fetcher sees a 1.4 kB client-rendered shell for every ind.nl route page
(the amounts page is the exception, which is why the numbers were checkable at
all). DE (BAMF), FR (service-public) and ES (UGE) route pages all return real
bodies. So the Dutch route rules — the diploma leg, the designated-institution
list, the English requirement, the regulated professions — cannot be
machine-watched at all. Two human-tier watch entries added (orientation year,
Blue Card) with a 90-day re-read, and the constraint is now written down
instead of assumed.

**Left open deliberately** (scope, put to the human): the FR talent subtypes;
the reduced thresholds in three countries (NL €3,122 / €4,754, ES €33,085.09 —
each needs a "recent graduate" or shortage-catalogue fact); citizenship-specific
exceptions, which IND names explicitly for Turkish citizens and which the
one-pager always planned as additive data.


---

## 2026-09-04 — s5c built: the passport became a country, and the reviews earned their keep

The human took all three scope items and then made the call that shaped the
slice: ask *which country*, not *are you Turkish* — "ilerisi için elimizde veri
olur". That turned a stopgap into a mechanism.

**What the slice locks in:**
1. **`implies` on an option.** An answer satisfies values beyond its own, so
   all twenty-one `citizenship eq third_country` criteria stayed untouched
   while the answer set became 198 passports. One predicate serves criteria and
   notices, so a country can never satisfy a route but miss its note.
2. **A passport class is a rule, not a vocabulary.** `countries.json` separates
   the two: the country list needs no provenance, but the member list of
   `eu_eea_ch` decides who needs a permit at all, so it carries three sourced
   legs (EU-27 enumeration, EEA Agreement, EU–Switzerland agreement) and every
   leg is watched and quote-verified.
3. **A reduced threshold is a second path inside the same route.** IND issues
   one permit with two salary criteria; a second card would invent a
   distinction the authority does not make. Gaps measure to whichever
   threshold the profile can actually reach — verified on screen: €2,900 with a
   recent qualification reads €1,254.98 to €3,122, the same salary without it
   reads €1,235 to €4,357.
4. **Long answer lists get a control that fits them**, above twelve options.

**The reviews found what the tests could not.** Two independent passes, both
verified by measurement before anything was changed:

- **The vocabulary listed dependent territories and classed them all third
  country.** An Åland resident holds a Finnish passport and a Guadeloupe
  resident a French one; the tool told them they needed a work permit and
  suppressed the free-movement notice — the same harm as the EU-passport
  blocker the first product-critique found, reintroduced through data. The
  question asks which *passport*, and passports are issued by states, so the
  territories left the list (249 → 198) and the states whose passports their
  residents hold stayed.
- **The EU-27 class was sourced to page furniture** ("Click on the map and
  filters below…"), which says nothing about who is a member. Replaced with the
  page's own enumeration, and page 2 promoted to a value-source so all
  twenty-seven are inside quotes the fidelity gate checks.
- Enter on an untouched filter answered "Afghanistan"; the result list sat
  inside an aria-live region and re-announced sixty rows per keystroke; the
  coverage and quote gates had stopped being functions of their dataset
  argument; the equivalence cache ignored the value list it was asked about.

**Product-critique, light mode** (the genesis anchor for a non-v1 boundary)
walked the new flow and found a blocker the reviews had no reason to look for:
typing **"turkey"** — the name the affected user has used their whole life —
returned "No country matches — check the spelling", and the cold list shows 60
of 198 with no way to page, so they could not reach their country at all. Fixed
in the same pass with searchable aliases that are never displayed, so the label
stays the official name. Report:
`docs/spine/critiques/2026-09-04-product-critique-light.md`.

**Two scenario lines were mine and wrong**, caught by the builder and corrected
with measurements: "not yet" where the engine computes "within reach" (a
bounded gap has meant within reach since s5), and a claim that
`qualification_recent` never appears in a Spanish flow when the spec itself
gives es-blue-card a reduced path.


---

## 2026-09-04 — skill update adopted: cleared blockers now leave permanent checks

Re-read genesis, product-critique, devils-advocate and the new
product-critique-agent. Four changes land on this project, and the first one
indicts something that happened here this week.

**1. "A cleared blocker leaves a permanent check on the surface, and that check
targets the symptom, not the path."** The EU-passport blocker was cleared in
s5b through the citizenship criterion — and came back in s5c through the
country *data*, where Åland and Guadeloupe residents (Finnish and French
passport holders) were classed third-country. A path-shaped test could not see
it. `tests/blockers.test.ts` now holds symptom-shaped sweeps for the three
blockers cleared so far:
- every EU/EEA/CH passport in the list draws the no-permit notice and produces
  no pursuable route; no other passport draws it;
- the vocabulary lists passport issuers only, with the dependent territories
  named so re-adding one has to answer "whose passport do its residents hold?";
- every route states its unasked preconditions;
- every country is reachable by its own name, and by the names people actually
  type ("turkey", "holland", "drc").

The last sweep failed the moment it was written: **Kosovo was not in the list
at all**, so a Kosovar user could not answer the question. XK is user-assigned
rather than official ISO, which is exactly why it fell out of a generated list
— and exactly the kind of gap a symptom check catches and a path check does
not. Added, classed third country like any non-EU passport.

The matcher moved from the page into the engine (`matchOptions`,
`foldForSearch`) so "can this person find their country" has a test that
outlives the control rendering it.

**2. Walk blind.** The critique must not open previous reports, DECISIONS,
KANBAN or the git log until its scores are written. My light walk yesterday did
not: I had written the previous report myself and carried its findings into the
walk. Recorded as a miss, not a technicality — the rule exists because prior
findings steer a walk toward confirming them.

**3. The score is not a gate.** Blocker-clearance is. Two rules keep the number
honest: no silent regression within a rubric version (a dropped lens is a
finding or a recorded trade-off), and any lens at 2 or below owes at least one
finding. The light report satisfies both — no lens dropped, none scored 2.

**4. The v1-gate critique runs in isolation**, via the new
`product-critique-agent`, so the walk is not done by the session that made the
fixes. That is the plan for s6: I will spawn it rather than walking it myself,
and it walks blind by construction.

Also adopted: devils-advocate now names "page furniture" explicitly as a
non-source — the same failure caught here two days apart (the EU-27 membership
claim rested on "Click on the map and filters below…").

---

## 2026-09-04 — the five open design-flaw issues, cleared

The human read the light critique's leftovers and said fix them all. None was
a blocker; together they were the difference between a tool that works and one
that reads as finished.

- **#1 contrast.** `--color-muted` was #6f6c5d: 4.55:1 on the page ground, AA
  by a hair, carrying the smallest text in the product (source lines, tallies,
  hold reasons at 10.9–12.8px). Darkened to #5a5747 — **6.26:1 on the ground,
  6.90:1 on cards** — and `--text-source` raised from .72rem to .76rem. A
  token change to a human-approved palette, taken because the token was the
  problem: the character is unchanged, the legibility is not.
- **#2 the first number a skimmer saw was the largest one.** "Up to 24 quick
  questions" is the whole field set, which nobody answers; the interview stops
  as soon as no remaining question could change a verdict. The headline is
  plain again and the subline states the mechanism; the per-question counter
  keeps the honest number, and it shrinks as pruning bites.
- **#3 "extra rights" read like a better passport** in a passport picker, while
  the note it points at says the criteria are identical. Now "a note applies to
  this passport".
- **#4 the picker opened on sixty rows** nobody scrolls. It now opens empty:
  "Start typing to find your country — 199 to choose from." Safe only because
  aliases landed first — before them the cold list was the one escape hatch for
  a user who could not spell the official name.
- **#5 the Türkiye card carried ninety words of Decision 1/80.** The card shows
  the first sentence with an ellipsis; the full passage stays in the data,
  on the element, and a click away at the source. The evidence is complete,
  the card is readable — and the legal basis stays printed, because that is
  the part that makes it checkable.

The rule this follows: a recommendation that lives only in a report is a
recommendation nobody acts on. They were filed as issues first, fixed second,
and the report now carries their numbers.

---

## 2026-09-04 — editing an answer stopped costing every answer after it

Human catch: changing question 2 forced re-answering everything below it. That
was my s5b design — clicking a declared row truncated the history — and the
reasoning was sound but the bill went to the wrong party: an early answer *can*
invalidate later ones, so I dropped them all rather than work out which.

Now the interview decides. `replayAnswers()` walks the stored answers in the
order they were asked and keeps each one the flow still asks for, using
`remainingQuestions` — the same function that drives the interview, so "would
this still be asked?" is answered by the engine rather than by a rule written
twice. Measured on the running page:

- Change **Shortage list** yes → no: every other answer survives, and the
  screen goes straight back to the results.
- Change **Situation** offer → transfer: destination, passport and situation
  are kept; qualification, recognition, shortage, experience and salary are
  dropped, because an intra-corporate transfer never asks them. Straight to
  results again — no re-answering, and nothing stale left behind.
- **Cancel** restores the previous value and changes nothing else.

The edit screen says what it is doing ("Changing one answer — the rest are
kept") and its Back button reads "Cancel", because during an edit there is no
"back" to walk to. A row being edited no longer appears twice in the panel.

---

## 2026-09-04 — a revisited question shows the answer you gave

Human catch, following the edit-in-place fix: going back to an answered
question showed an empty screen, as if the answer had been thrown away. It had
been — `jump()` deleted it so the interview would ask again.

The answer now stays on screen while it is being reconsidered:

- The option you chose renders selected (band-coloured bar, tinted row, a tick,
  `aria-pressed`), and picking another replaces it.
- The country picker opens with your country in the box and its row marked, so
  the passport question behaves like every other one.
- **Back walks answers instead of erasing them.** It steps to the previous
  answer and shows it; nothing is lost on the way, and the same replay decides
  what survives once you change something.
- "Keep this answer" leaves the question untouched — the escape hatch that used
  to be Cancel, now that nothing needs restoring.
- The meta line says what the screen is for: "Your answer — pick another to
  change it, the rest are kept."

Verified on the running page: revisit qualification (University degree marked),
Back to situation (job offer marked), revisit the passport (box holds "Brazil",
row marked), then Keep this answer → straight back to the same eight-answer
result. The two buttons no longer run together.

---

## 2026-09-04 — "Also required" was stating what the permit allows

Human catch: the Opportunity Card listed **"Also required — not checked here:
Part-time work limited to 20 hours/week while searching."** That is not a
requirement the applicant must satisfy — it is what the card *permits*. Under a
heading that says "Also required", it read as one more hurdle on a card whose
whole point is that it has few.

Removed. The fact still stands where it belongs: the route summary already
reads "One-year job-search card with part-time work (20h/week)".

**The rule that invited it is fixed too.** `blockers.test.ts` demanded a
precondition line from every route, so a route with no unasked condition we can
source got filler instead of an exemption. Now the exemption is explicit
(`NO_UNASKED_CONDITIONS`, currently just the Chancenkarte) and a second check
rejects any precondition phrased as a permission — "permitted", "allowed",
"hours/week", "renewable", "valid for". A guard that forces text into a field
will get text; it should force a decision instead.

Scanned every other route's preconditions for the same mistake: this was the
only one.

---

## 2026-09-04 — the cards were written in the source's language, not the reader's

Human catch, from one line: "German appropriate to the occupation · Secured
livelihood" says nothing to someone who has not read § 18a. Looking at the
rest, most summaries had the same problem, and three of them leaked *modelling*
notes into user-facing text ("modelled as a second path on the salary
criterion", "so none is modelled", "the shortage-occupation limb is stated as a
precondition, not scored"). All 23 routes rewritten.

The line the human pointed at now reads:
- "Enough German for the job itself — how much depends on the work"
- "Enough income to live on without state support, plus health insurance (the
  salary from the job normally covers this)"

The rule this pass follows: **a quote is the source's words and never changes;
a summary and a precondition are ours and owe plain English.** Jargon that
survived translation went out or gained its meaning inline — "Engpassberufe"
became "Germany's shortage list", "collectively bound" became "covered by a
collective wage agreement", "positive administrative silence" became "if they
do not answer in time the application counts as approved", UGE/TWV/BIG/CNO-2011
either explained or dropped. Nothing became more specific than its source: the
German-language line still says "how much depends on the work", because the
law does not name a level.

Three tests failed on the rewrite because they asserted the *phrasing that
carried a fact* rather than the fact: an ES precondition containing the string
"CNO-2011", an NL summary containing "reduced", an FR precondition matching
`/3 months' seniority/`. Each now asserts the fact — the shortage limb is
disclosed, nl-ict carries only the full thresholds (4357, 5942), the French
mission states three months with the group. Copy is allowed to improve without
breaking the suite; facts are not allowed to disappear quietly.

---

## 2026-09-04 — steward-7 adopted, and an isolated critique found what I had not

Re-read genesis, status, product-critique and the agents. Four rules land here,
and the isolated run that came with them proved three of them in one go.

**The blocker: Dutch amounts carried no unit.** Cards read "€5,942" while the
German card read "45.630 Euro im Jahr" — a twelvefold error for anyone
comparing them, and the dataset knew better the whole time (`salary_eur_month`
carries its period). Fixed at every point an amount reaches the screen: rail
labels, tick tooltips, and a `· per month` caption beside the quote, since the
quote is the source's words and cannot be edited to say it.
**Cost:** the caption is ours, not the source's, so a reader now sees one clause
on the provenance line that no official page wrote. The alternative — a bare
number that reads as annual — is worse.

**"Not met: located in France" was answering a question nobody asked.** Once a
route is in the wrong country nothing else about it is news, so a single
localization failure now decides the row: "A France route — you told us
Germany", collapsed into "5 France routes — you told us Germany".
**Cost:** a route that is both in the wrong country *and* short on salary no
longer shows the salary gap. That is deliberate — the gap would be advice about
a country the person is not going to.

**A zero-result screen was hiding the steps it counted.** "6 steps would change
that" with two of them inside collapsed sections. Every section holding a step
now opens when nothing is open anywhere.
**Cost:** on a four-country zero result the page is longer; the alternative is a
headline that promises what the screen withholds.

**Routes with no numeric threshold now say so.** The first screen promises that
every value shows its quote and read date; on a route with no value there was
simply silence, which reads as if the promise held. The card now says there is
no dated value to quote and points at the official page.
**Cost:** an extra line on seven cards, and it advertises a gap. Better
advertised than implied.

**Scores withdrawn from the light run.** It did not walk blind (I had written
the previous report) and it never opened its own screenshots. A run that breaks
its conditions publishes findings and no numbers — and within the day two of
those numbers were shown wrong: Copy 4/5 on cards the human then found
unreadable, and a walk that passed straight over the unit blocker.

**Still open, deliberately:** the gap figure is imprecise by up to the width of
a salary band (isolated finding 3) — "up to €X" is honest but coarse, and
asking an exact salary is a roadmap candidate, not a patch. Phone width stays
un-assessed by the critique's own environment; I measured 390 px via device
emulation and put a real handset on the human's checklist.

**Rules adopted beyond this slice:** checks require decisions, not content
(a rule that can be silenced by writing something will be — it produced a false
precondition and a page-furniture quote here); scenarios are verified by
reading each screen as prose, not by matching substrings; DECISIONS entries
state their cost, not only what they buy — this entry is the first written that
way; and every report's human-facing residue goes in the message and into
STATUS.md's checklist, not only into a file.


## 2026-09-06 — the human verification pass, and country labels written by hand

**35 of 39 checklist items confirmed at their sources.** `verify-s5.md` closed
21/21; `verify-s5c.md` closed 16/18, including the Spanish PDF tier — the four
values no machine here can read. The top-200 mechanic the earlier report called
absent is in the source after all, verbatim: two of three ranking publishers.
Two items stay open and both now point at new text (below).

**Gate (human chose): country labels are hand-written, not CLDR's.** The list
was generated from `Intl.DisplayNames`, which abbreviates ("St. Kitts &
Nevis"), punctuates oddly ("Congo - Kinshasa") and disambiguates in ways no
passport does ("Hong Kong SAR China"). Twelve labels were rewritten to the
names people use. Every displaced form is kept as an alias, so nothing became
unfindable, and a test fails if an abbreviation or localisation artefact
returns — the generator script no longer exists, so `countries.json` is the
source of truth and only a test can hold the line.

**Cost:** the labels are now ours to maintain. A future country added by hand
gets no localisation for free, and the exonym list grows by hand with it.

**A live defect fell out of doing it.** Search folded away diacritics but not
punctuation, so the label "Côte d'Ivoire" — carrying a typographic apostrophe —
could not be found by anyone typing a straight one. "guinea bissau" without the
hyphen found nothing either. Folding now drops everything that is not a letter
or a digit, and each name is folded on its own so a needle cannot match across
the seam between a label and an alias. This is the third time this control has
hidden a country from the person who owns that passport ("turkey", the
dependent territories, now the apostrophe); the permanent check is the test
that types each displaced form and demands its country back.


## 2026-09-06 — the learn links are watched, and one of them was dead

**The human clicked both s3 learn links: Anabin opens, § 18g does not.** Not a
broken URL — `gesetze-im-internet.de` resolves and then times out from Türkiye,
where this project's first readers are. The link had been in the product since
s3, verified once by eye at a moment when it happened to answer, and nothing
had looked at it since.

**Cheap default: point it at buzer.de.** The project already reads German law
there, the consolidated § 18g is the same text, and it answers from here. The
label now names what the reader will actually find — the ISCO-08 groups (132,
133, 134, 21, 221, 222, 225, 226, 23, 25) — because a statute page in German
is a poor answer to "is my occupation on the shortage list" unless you are told
what to look for.

**Learn links now join the coverage gate,** via a new `link` watch tier. It
checks liveness and nothing else: a learn link backs no value, so its wording
may change freely, and hashing it would raise a flag every time an unrelated
paragraph moved — the flag that cries weekly is the flag nobody reads. Silence
is the only news, and silence already reports as `unreachable`.

**Cost, stated plainly:** the watch runs from CI, not from the reader's chair.
It proves the page answers *somewhere*. § 18g would have passed this gate every
day while being dead for the person the tool is for. The gate catches a page
that disappears; it cannot catch a page that disappears only for you. What it
does buy is that choosing a widely reachable mirror over a canonical host is
now a recorded decision rather than an accident.

**Also found while looking:** two learn links added in s5/s5c (the French
innovative-employer page, the IND designated-institutions page) were never on
the s3 checklist. They happen to be watched already, because they are also
value sources. The checklist had aged past what it covered.


**Closed 2026-09-06:** all four learn links clicked and confirmed by the human —
buzer.de § 18g, Anabin, the French innovative-employer page, the IND
designated-institutions page. The last item carried over from s3 is done.


**Closed 2026-09-06: the watch-flag verdicts, confirmed by the human.** The
buzer flag was our own marker edit and the IND flag an unrelated menu item;
both closures stand.

**Withdrawn the same day: my own request for the IND researcher row wording.**
I had been asking for a sentence the dataset already carries. The quote was
rebuilt from the watched snapshot on 2026-09-04 — "These amounts are valid from
1 July 2026 up to and including 31 December 2026. Gross SV salary per month
without holiday allowance € 1,635.90" — and it is contiguous in the snapshot,
directly under "Application for a residence permit as a researcher, guest
lecturer or physician in training to be a specialist". The checklist line
describing it as a bare number predated the rebuild and I carried it forward
three times without re-reading the value it described. The criterion's stale
"Row wording flagged for human re-verification" note is removed.

Worth keeping in view: €1,635.90 appears six times on that page, because many
permit types share the minimum. The number identifies nothing on its own; what
places it is the section it sits in, which the quote does not include and
`legal_basis` does. That is a weakness of quoting a row from a table, not of
this row.


## 2026-09-06 — the name is a working name, and skills reload at the boundary

**Recorded, not chosen: "visa-navigator" is a working name.** It was the
directory's name, became the repo's, and was never decided. Spine's own notes
place naming as an early gate — cheap before launch, expensive after, because a
domain, GitHub URLs, inbound links and a launch post all harden around it. The
name fork opens the s6 boundary session, alongside the dataset licence.

**Cost of leaving it: none yet, and rising.** Every day before launch costs
nothing; every day after costs a redirect, a rename, and whatever links already
point at the old one.

**Boundary sessions now begin by reloading the Spine skill files.** This run has
twice inherited a contract it never read — s2 landed without the screen-mock
rule because genesis was invoked before that rule existed. Reloaded today at
`steward-17`; the stamp lives in STATUS's *Where are we* so a future session can
see which contract this one ran under.

**Applied from that reload, immediately:** STATUS's expected-from-you list now
carries the hand-off test (exact target · exact thing to look for · what a pass
looks like · why it is the human's), and `docs/spine/ARCHITECTURE.md` was
redrawn — it still described 21 routes and "FR/ES/NL not built yet" four slices
after they landed.

**The rule that indicts three of my own asks this week:** *do not hand over what
you can do.* "These links need verifying" was an item I was supposed to close,
not raise — the German link's unreachability took one fetch to establish, and I
put it on the human's list instead. So did the country-name spot-check I could
have run, and the IND researcher wording I asked for three times while the
dataset already carried it.

## 2026-09-06 — v0.7: s5, s5b and s5c are real-green

The human walked the acceptance scenarios on the live product and confirmed
them: the Germany regression, the Dutch monthly flow, the "anywhere" weak
profile, back-and-edit, and the EU-passport notice. With the 39 verified values
already in, both halves of real-green are done — the data is right and the
screens read right to a person who is not the one who built them.

**v0.7 stamped:** four countries, 23 routes, honest verdicts, exceptions.

**Cost of the stamp:** the product-critique cadence now owes v0.7 a full walk,
and the walk is mine rather than the isolated agent's, because v0.7 does not
reach real users. That is a real obligation, not a formality: the last two
stamped states each hid a live defect that only a walk found — Dutch amounts
with no unit, and card prose the human could not read.

**Not stamped, deliberately:** nothing about the name, the licence or the
roadmap. Those are the release gate, and they open the s6 boundary as forks.
