# Intake — the trackers, read into Steward

One marker per repository (the newest `updatedAt` the read took), one line per
item the read took through the protocol. Born 2026-09-17 at the first intake
read (`/spine:steward`, nothing pasted); both trackers read with the fixed
commands, counts agreeing with the listings (site 1 = 1, data 8 = 8; 0 open
PRs on either).

last-read: OytunOnal/permit-rulebook 2026-09-15T14:05:54Z
last-read: OytunOnal/permit-rulebook-data 2026-09-24T10:08:19Z

## Items

| read | repo | # | class | what happened |
|---|---|---|---|---|
| 2026-09-17 | permit-rulebook | #8 | design-flaw | handled by s10 + s22 (live 09-15/09-16); comment left; stays open for the after-reading — metrics row 6 |
| 2026-09-17 | permit-rulebook-data | #7 | bug | fixed by s7 (2026-09-10); closed with a comment |
| 2026-09-17 | permit-rulebook-data | #8 | design-flaw | s7 + s8 shipped, #9–#12 closed; the remainder is the `later` candidate "More citizenship exceptions" (kept at the 09-17 fork); closed |
| 2026-09-17 | permit-rulebook-data | #13 | bug | on the board: v1.2 fix data #13; label right; open |
| 2026-09-17 | permit-rulebook-data | #15 | bug | on the board: v1.2 fix data #15; label right; open |
| 2026-09-17 | permit-rulebook-data | #16 | held: Spain's annual order (búsqueda de empleo quota), end of December 2026 | comment left; open |
| 2026-09-17 | permit-rulebook-data | #17, #19 | not ours (IND page churn) + our fix s14 | one finding; both closed with a comment naming s14 |
| 2026-09-17 | permit-rulebook-data | #18 | bug | the daily watch failed on the IND wall 09-11→09-16; s14/s15; 09-17 run clean; closed |
| 2026-09-17 | permit-rulebook-data | #13, #15 | bug | shipped in s29 (data d062750); closed with a comment each |
| 2026-09-22 | permit-rulebook-data | #21 | not ours (source outages) + measurement | two runs red on source-side 403s and timeouts, green again 09-22; metric 2 read off target; the retry is a v1.2 queue item (human: "b"); closed with a comment |
| 2026-09-24 | permit-rulebook-data | #22 | not ours (source outages) + measurement | the *watch run failed* issue of 09-23, extended by the runner on 09-23 (a dispatch) and 09-24 (the first scheduled run after s34): `bamf-hochschulabsolvent` and `bamf-selbstaendige-taetigkeit`, `fetch failed`, the cause unprinted; the same class as #21 and the case s35's scenario is written from; stays open until s35's real-green and closes on the human's word, not before |
