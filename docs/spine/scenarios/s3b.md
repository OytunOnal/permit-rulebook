# s3b — "Kaldıraç analizi: teklif alırsan şunlar açılır" · Acceptance senaryosu

Statü: ONAYLANDI (insan, 2026-09-02) ve KOŞULDU.
Ekran mock'u: `docs/spine/design/s3b-unlocks.html`.
Doğum: insan sorusu 2026-09-02 — "hangisini sağlamaya yakın olduğunu
bilmiyoruz, öneri veremiyoruz".

## Yaklaşım (deterministik, LLM'siz)

"situation" bir özellik değil bir **adımdır**; yakınlığı bilinemez ama
**kaldıracı** hesaplanabilir: profil, path-alanının her alternatif değeriyle
karşı-olgusal yeniden değerlendirilir; met/near'a dönen route'lar o adımın
"açtıkları" olarak listelenir. Şemaya alan başına `kind: attribute | path`
eklenir (varsayılan attribute); karşı-olgusal YALNIZ path alanlarında koşar —
"genç olsaydın" önerilmez.

## Adımlar

1. Gezgin profili (situation=none) sonuç ekranında, NOT YET grubunun üstünde
   yeni bölüm: **"If your situation changes — what each step unlocks"**;
   teklif satırı §18b/BC-shortage/§19c (met) + BC-general (within reach,
   €4.766) listeler; transfer → ICT; hosting → Researcher.
2. Yalnız gerçekten açılanlar listelenir; bir alternatif hiçbir route
   açmıyorsa satırı hiç görünmez. Bölüm, hiçbir path-alanı başarısız değilse
   (ör. tekliflisin) hiç render edilmez.
3. Teklif satırının altında Chancenkarte köprü notu ("bir yıl arayarak geçir,
   20h/hafta çalış") — yalnız Chancenkarte o profilde canlı/açıksa.
4. Hesap saf `evaluate` karşı-olgusalı; testler: gezgin → 3 satır, doğru
   route kümeleri; attribute alanları (yaş, vatandaşlık) asla karşı-olgusala
   girmez; tekliflide bölüm yok.
5. Regresyon: mevcut 32+ test ve gruplu ekran davranışı aynen.

## Koşumlar

- mock-green + real-green: 2026-09-02 — mock yok, tek koşum: gezgin akışı
  tarayıcıda üç unlock satırı + CK köprü notu + NOT YET grubu; 6 yeni test
  (toplam 38) adım 2/4/5'i kapsıyor. Dürüstlük davranışı doğrulandı: teklif
  karşı-olgusalı yalnız *mevcut cevaplarla karara bağlanabilen* route'ları
  listeler (maaş sorulmamışsa BC "açılır" diye gösterilmez).
