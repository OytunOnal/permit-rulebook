# KANBAN — Visa Navigator

Sıralama risk-öncelikli: walking skeleton → en ölümcül sınanmamış varsayım →
tekrar; varsayım bitince değere göre. Dilim ancak koşulmuş acceptance
senaryosuyla ilerler: mock'ta geçince **mock-green**, gerçekte geçince
**real-green**. Doğan her mock, doğduğu anda backlog'a de-mock görevi ekler.

## backlog

- **De-mock: S1 eşik değerlerini resmî sayfadan insan gözüyle yeniden doğrula**
  (doğum: S1 seed verisi research-ajanı fetch'inden geliyor)
- **S2 — Soru türetme + information gain** · DE'nin tam route seti (8-9);
  sorular predicate'lerden, bant seçenekleri eşiklerden otomatik; sıra
  information gain. _Sınar: A10, A15, A14 zemini._
- **S3 — Gap analizi** · Near-miss hesabı + met/near/hold gruplu tam sonuç
  ekranı + "Official page ↗". _Sınar: A9._
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

## active

_(boş — S2 boundary session bekliyor: S1 senaryosu insanla koşulacak, S2
senaryosu yazılıp onaylanacak)_

## mock-green

_(boş)_

## real-green

- **S1 — Walking skeleton** · 2026-09-01. Senaryonun 7 adımı da geçti
  (`docs/spine/scenarios/s1.md`). `visa-rules@bb348a9` +
  `visa-navigator@71c3106`. Not: insanla birlikte koşum S2 boundary
  session'ında; S1 değer-doğrulama de-mock görevi backlog'da duruyor.

## done

_(boş)_
