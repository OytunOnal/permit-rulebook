# ARCHITECTURE — Visa Navigator (v0.4 itibarıyla)

Her dilim çıkışında güncellenir; her zaman son real-green durumu resmeder.

```mermaid
flowchart LR
    subgraph rules["visa-rules (kardeş repo — tek doğruluk kaynağı)"]
        DATA["data/de.json<br/>8 route · 15 alan (+learn kaynakları)<br/>her değer: alıntı+kaynak+tarih+history"]
        SCHEMA["schema/ruleset.schema.json<br/>JSON Schema 2020-12"]
        ENGINE["src/engine + questions<br/>evaluate · deriveBands · points/in/any<br/>remainingQuestions (info-gain + budama)<br/>unlocks (path-alanı karşı-olgusalı)"]
        VALIDATE["src/validate (ajv)<br/>+ cli-validate (ndjson log)"]
    end

    subgraph nav["visa-navigator (bu repo)"]
        BUILD["Astro build<br/>sınır doğrulaması: geçersiz dataset → build kırılır"]
        SITE["Statik çıktı (dist/)<br/>tek sayfa + 9.5kB client JS"]
    end

    subgraph device["Kullanıcı cihazı — GÜVEN SINIRI"]
        UI["Tarayıcı: soru akışı → gruplu sonuç ekranı<br/>(özet şeridi · statü grupları · öğren-linkleri)<br/>değerlendirme tamamen client-side"]
    end

    DATA --> VALIDATE --> BUILD
    SCHEMA --> VALIDATE
    DATA --> BUILD
    ENGINE --> BUILD --> SITE --> UI
    UI -. "cevaplar cihazdan ÇIKMAZ<br/>(backend yok, telemetri yok)" .-> UI
```

Bileşenler, birer satır:

- **data/de.json** — kural veri seti; sayısal her değer resmî kaynak URL'si,
  birebir alıntı, okunma tarihi ve append-only `history` taşır (CC-BY-4.0).
- **ruleset.schema.json** — kamusal sözleşme; alıntısız/tarihsiz değer şemadan
  geçemez.
- **engine** — saf fonksiyonlar: uygunluk `if` ile (`eq`/`in`/`gte`/`points`/
  `any`), bant sınırları = eşikler, met/near/hold + gap; sorular kurallardan
  türer, sıralama greedy information-gain, karar değiştiremeyecek soru sorulmaz.
- **validate / cli-validate** — sınır doğrulaması; CI ve build kapısı, ndjson
  yapılandırılmış log.
- **Astro build** — dataset'i sınırda doğrular, engine'i tek küçük island
  olarak paketler; ajv client'a sızmaz.
- **Statik site** — health satırı (dataset/şema sürümü + en yeni okuma tarihi),
  IRCC-tarzı disclaimer; tokens.css ("Damgalı Panel") tasarım sistemi.
- **Güven sınırı** — kişisel beyanlar (vatandaşlık, maaş bandı, yaş…) yalnız
  tarayıcı belleğinde; hiçbir ağ isteğiyle dışarı çıkmaz.

Henüz yok (planlı): kaynak izleme cron'u (s4, `visa-rules` CI'ında koşacak),
FR/ES/NL veri dosyaları (s5), deploy hedefi (s6).
