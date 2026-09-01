# KANBAN — Visa Navigator

Sıralama risk-öncelikli: walking skeleton → en ölümcül sınanmamış varsayım →
tekrar; varsayım bitince değere göre. Dilim ancak koşulmuş acceptance
senaryosuyla ilerler: mock'ta geçince **mock-green**, gerçekte geçince
**real-green**. Doğan her mock, doğduğu anda backlog'a de-mock görevi ekler.

## backlog

- **De-mock: S1+S2 değerlerini resmî kaynaktan insan gözüyle doğrula** —
  liste `docs/spine/scenarios/s2.md`'de (S2'nin real-green koşulu; S1 de-mock
  görevi bununla birleşti). Ek: buzer.de aynasından alınan statü alıntılarını
  gesetze-im-internet.de'ye karşı yeniden doğrula.
- **45+ yaş kurallarını (55% eşiği) kriter modeline al** (S2'de nota indirgendi)
- **S3 — Gap analizi** · Near-miss hesabı + met/near/hold gruplu tam sonuç
  ekranı + "Official page ↗". Aday: "bilmiyorum" cevaplı alanlar için
  "şuradan öğren" resmî-kaynak linki (DE denklik → Anabin) — insan önerisi
  2026-09-02. _Sınar: A9._
- **S4 — DE kaynak spike'ı + izle-bayrak pipeline** · Spike: DE stabil değer
  kaynağı (headless / duyuru indeksi / insan-okur). Sonra: NL+FR+DE izle+
  hash/diff+issue, ES PDF hash. _Sınar: A13, A3 çözümü._
- **S5 — FR/ES/NL dolumu** · ~35-40 route, ülke başı yazılı hariç-tutma
  listesi; CI'da şema zorlaması (alıntısız/tarihsiz değer build kırar).
  _Sınar: A5 revize, A12, A4._
- **S6 — Kamuya açılış** · `visa-rules` repo public (CC-BY-4.0, CONTRIBUTING,
  kapsam katmanları), site deploy, route-başına mikro-sayfalar (uzun kuyruk),
  disclaimer/hukuk dili (A1 koşulları), GitHub/HN lansman hazırlığı.
  _Sınar: A2, A7, A8 gerçekte._

### v1.x / dalga 2 (v1 sonrası)
- LLM çıkarım + kod doğrulama + otomatik PR (pipeline tam hattı)
- "Route hakkında soru sor" (alıntı-temelli RAG)
- LLM build-time soru-ifadesi cilası (A14)
- TR arayüz
- CA + AU (A6) · dalga 3: diğer Avrupa · ABD ayrı karar
- JobRadar entegrasyonu (çapraz yönlendirme)
- Veri-toplamayan kullanım sayacı
- Denklik yardımcısı (insan önerisi 2026-09-02): üniversite+bölüm beyanı alıp
  Anabin (ve FR/ES/NL muadilleri) kaydını gösterme. Önce araştırma: Anabin
  erişilebilirliği (API yok, bot-duvarı riski), A1 uyumlu çıktı dili ("Anabin
  şu statüyü listeliyor, kaynak şu" — karar değil), ülke başına denklik
  kaynağı envanteri.

## active

_(boş — S3 boundary session bekliyor)_

## mock-green

- **S2 — Soru türetme + information gain** · 2026-09-02. DE 8 route / 15 alan;
  `points`+`in`+`any` op'ları; adaptif info-gain; 33 test; iki akış tarayıcıda
  koşuldu (`docs/spine/scenarios/s2.md`). Real-green koşulu: insan değer
  doğrulaması (backlog'daki de-mock). `visa-rules@652628e`,
  `visa-navigator@a338f88`.

## real-green

- **S1 — Walking skeleton** · 2026-09-01. Senaryonun 7 adımı da geçti
  (`docs/spine/scenarios/s1.md`). `visa-rules@bb348a9` +
  `visa-navigator@71c3106`. Not: insanla birlikte koşum S2 boundary
  session'ında; S1 değer-doğrulama de-mock görevi backlog'da duruyor.

## done

_(boş)_
