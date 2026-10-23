import { describe, expect, it } from "vitest";
import { buildDirectoryInMemory } from "./build-directory-in-memory.js";
import { annotationsOf, flowRunInProcess } from "./carry-runs.js";
import { CSS, CSS_NAME, DIGESTS, liveDeployAnswers, pageNaming } from "./deploy-fixtures.js";
import { pageOf } from "./live-page.js";
import { liveSiteInMemory } from "./live-site-in-memory.js";

/**
 * The carry's flow against an in-memory live site and build directory, on a
 * fixed clock, run in this process (`flowRunInProcess`): the one origin it
 * reads from, and what it prints of that origin. What it takes forward is
 * `carry-takes-the-live-generation-forward.test.ts`'s.
 */

/** The run's counted line, wherever the annotations after it leave it. */
const summary = (out: string): string => out.split("\n").find((line) => line.includes("left behind")) ?? "";

/** The password a credential case hides in `CARRY_ORIGIN`. */
const SECRET = "s3cr3tPW";

/**
 * Passwords around `SECRET`, each with a character a redaction keyed to the
 * address's shape would end at, or an `@` inside the password.
 */
const PASSWORDS: [string, string][] = [
  ["a question mark", `${SECRET}?x`],
  ["a hash", `${SECRET}#x`],
  ["a space", `${SECRET} x`],
  ["an at sign", `${SECRET}@x`],
];

/**
 * Origins carrying `SECRET` that are refused before any parse has had a chance
 * to clean them: by construction the ones that fail `^https?://` or fail
 * `new URL`.
 */
const ORIGINS_REFUSED_UNPARSED: [string, string][] = [
  ["another scheme", `ftp://reader:${SECRET}@permitrulebook.com/`],
  ["no scheme at all", `u:${SECRET}@permitrulebook.com/`],
  ["protocol-relative", `//reader:${SECRET}@permitrulebook.com/`],
];

/**
 * The page is a stranger's string, and a deploy is a bad place to trust one.
 * Every case here is a reference the live HTML could name and this step must
 * refuse — by name, on one line, without a single request to the host it
 * names.
 */
describe("the carrier fetches from our origin and nowhere else", () => {
  it("refuses a reference to another host, another scheme, or no host at all", async () => {
    const mine = "index.CCCCCCCC.css";
    const answers = liveDeployAnswers({ [mine]: CSS });
    const live = liveSiteInMemory(answers);
    try {
      // The page is written once the host is known, because the scheme case
      // has to name this very host: then only the `https:` makes it foreign —
      // the mirror of an `http://` reference on the live site, which is https.
      const foreign = [
        "https://evil.example/_astro/absolute.DDDDDDDD.js",
        "//evil.example/_astro/protocol-relative.EEEEEEEE.js",
        `https://${new URL(live.url).host}/_astro/scheme.FFFFFFFF.js`,
      ];
      answers["/"] = { type: "text/html; charset=utf-8", body: pageOf([...foreign, `/_astro/${mine}`]) };
      const out = buildDirectoryInMemory();
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      // Ours, and only ours. Nothing was asked of this host on behalf of the
      // three foreign references either.
      expect(live.asked).toEqual(["/", `/${DIGESTS}`, `/_astro/${mine}`]);
      expect(out.assetNames()).toEqual([mine]);
      // Each of the three is reported, and each is reported as much of itself
      // as a log line can afford: a page chooses how long its references are,
      // so a refusal prints a bounded head of one rather than the whole of it.
      for (const ref of foreign)
        expect(run.out, `${ref} was not reported`).toContain(ref.slice(0, 30));
    } finally { live.close(); }
  });

  it("counts a reference as ours only when it resolves to this page's own `_astro/`", async () => {
    // `/_astro/../real.css` resolves to `/real.css`, a URL this deploy does not
    // publish; scored by its basename against `dist/_astro/real.css`, it would
    // read "already in this build" while the reader holding that page 404s. A
    // name is one of this deploy's assets only when the whole resolved path is
    // the one this step would build for that name.
    const real = "index.IIIIIIII.css";
    const answers = liveDeployAnswers({ [real]: CSS });
    answers["/"] = { type: "text/html; charset=utf-8", body: pageOf([`/_astro/../${real}`]) };
    const live = liveSiteInMemory(answers);
    const out = buildDirectoryInMemory({ [real]: CSS });
    try {
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      // Never fetched, and never counted as built: the page, and nothing else.
      expect(live.asked, run.out).toEqual(["/"]);
      expect(summary(run.out), run.out).toContain("0 already in this build");
      expect(summary(run.out), run.out).toContain("1 left behind");
      expect(annotationsOf(run.out), "the reader 404s on a URL and the run said nothing").toContain(real);
    } finally { live.close(); }
  });

  it("counts a root-absolute reference as ours only under the base this deploy serves", async () => {
    // A site served from a subpath: a page carrying a root-absolute
    // `/_astro/old.css` names a URL the host 404s. Rebuilt under the base by
    // its basename, it would be fetched and reported carried for a URL the
    // deploy will never serve.
    const base = "/permit-rulebook";
    const stale = "index.JJJJJJJJ.css";
    // The live deploy has both, under its base, and its digest list names both:
    // nothing else refuses this one, so what the step does with it is decided
    // by where the reference resolves and by nothing else. The host 404s the
    // root-absolute path, the way Pages does.
    const answers = liveDeployAnswers({ [CSS_NAME]: CSS, [stale]: Buffer.from("/* the stale one */\n", "utf8") }, base);
    answers[`${base}/`] = {
      type: "text/html; charset=utf-8",
      body: pageOf([`${base}/_astro/${CSS_NAME}`, `/_astro/${stale}`]),
    };
    const live = liveSiteInMemory(answers);
    const out = buildDirectoryInMemory();
    try {
      const run = await flowRunInProcess(`${live.url}${base}/`, out);
      expect(run.status, run.out).toBe(0);
      expect(live.asked, run.out).not.toContain(`${base}/_astro/${stale}`);
      expect(out.assetNames(), run.out).toEqual([CSS_NAME]);
      expect(annotationsOf(run.out), run.out).toContain(stale);
    } finally { live.close(); }
  });

  it("annotates every reference that resolves under our own origin to a URL this deploy does not publish", async () => {
    // Whether a refusal predicts a reader's 404 is decided by where the
    // reference RESOLVES: under our origin and not to one of this deploy's
    // assets is the reader's 404, whatever made it one. Another host's is
    // that host's business, and a reference that resolves nowhere is a
    // request no browser makes either.
    const mine = "index.KKKKKKKK.css";
    for (const [label, ref, mark] of [
      ["a percent-encoded separator", "/_astro/sub%2Fold.css", "/_astro/sub%2Fold.css"],
      ["a trailing dot segment", "/_astro/old.css/.", "/_astro/old.css/."],
      ["the directory itself", "/_astro/", "/_astro/"],
      ["a name over the 128-character ceiling", `/_astro/${"a".repeat(136)}.css`, "a".repeat(40)],
    ] as [string, string, string][]) {
      const answers = liveDeployAnswers({ [mine]: CSS });
      answers["/"] = { type: "text/html; charset=utf-8", body: pageOf([`/_astro/${mine}`, ref]) };
      const live = liveSiteInMemory(answers);
      // This build already has the healthy one, so nothing else can raise an
      // annotation: no name is missing and the page does reference one of ours.
      const out = buildDirectoryInMemory({ [mine]: CSS });
      try {
        const run = await flowRunInProcess(live.url, out);
        expect(run.status, `${label}: ${run.out}`).toBe(0);
        // Not fetched, either: a URL this deploy does not publish is named, not
        // asked for.
        expect(live.asked, `${label}: ${run.out}`).toEqual(["/"]);
        expect(annotationsOf(run.out), `${label} left the reader's 404 unannounced: ${run.out}`).toContain(mark);
        expect(annotationsOf(run.out), `${label}: ${run.out}`).toContain("gets a 404");
      } finally { live.close(); }
    }
  });

  it("keeps a credential in the address out of the deploy log, whatever the password is made of", async () => {
    // A credential in `CARRY_ORIGIN` must not reach a deploy log, and a guard
    // that depends on what the secret is made of is not a guard: a password
    // may carry `?`, `#`, `/`, a space or an `@`, and a value carrying one of
    // the first four also fails `new URL`. So the shapes are the case.
    const live = liveSiteInMemory(liveDeployAnswers({ [CSS_NAME]: CSS }));
    const out = buildDirectoryInMemory();
    try {
      for (const [label, password] of PASSWORDS) {
        const run = await flowRunInProcess(`http://reader:${password}@${new URL(live.url).host}/`, buildDirectoryInMemory());
        expect(run.status, `${label}: ${run.out}`).toBe(0);
        expect(run.out, `${label}: the repository variable's secret reached the deploy log`).not.toContain(SECRET);
      }
      // Dropped, not the address with them: what is left is still the page this
      // step was pointed at, and it is read.
      const plain = await flowRunInProcess(`http://reader:${SECRET}@${new URL(live.url).host}/`, out);
      expect(plain.status, plain.out).toBe(0);
      expect(plain.out, "the repository variable's secret reached the deploy log").not.toContain(SECRET);
      expect(out.assetNames(), plain.out).toEqual([CSS_NAME]);
      // And on the paths that refuse the value before any parse has had a
      // chance to clean it. What holds there is not printing a value that did
      // not parse.
      for (const [label, value] of ORIGINS_REFUSED_UNPARSED) {
        const refused = await flowRunInProcess(value, buildDirectoryInMemory());
        expect(refused.status, `${label}: ${refused.out}`).toBe(0);
        expect(refused.out, `${label}: a value refused unparsed took the secret into the log with it`).not.toContain(SECRET);
        // Positive, so the absences above cannot be the whole of the case: the
        // line still says which variable was unusable, which is the diagnostic
        // the value itself was standing in for.
        expect(refused.out, `${label}: nothing in the log says which variable was unusable`).toContain("CARRY_ORIGIN");
      }
    } finally { live.close(); }
  });

  it("names no host on the summary line that no socket was opened on", async () => {
    // The counted line says which origin this run read, and it exists to be
    // read during an incident. A redaction greedy to the last `@` anywhere in
    // the value would not lose a host — it would SUBSTITUTE one: a valid
    // origin whose query carries an `@` would come out as the query's own
    // host. The rule is to never print a value that did not parse. What parsed
    // is `from`, and `new URL` has already dropped the credentials from it;
    // what did not parse has no diagnostic worth, so the line says what was
    // wrong instead of showing the value.
    //
    // That is a rule about the ENVIRONMENT's one value, and not about every
    // string this step prints — which population each rule governs is written
    // beside the rule, at `pageUrlOf` in the flow.
    //
    // Two runs, because this value is a valid URL and only a run with no page
    // read reaches this line at all. The first reaches it by the bail before
    // the page is parsed; the second is a value of the same shape that cannot
    // parse, which is the bail that names the variable.
    const run = await flowRunInProcess("http://permitrulebook.com/x?to=a@evil.example", undefined);
    expect(run.status, run.out).toBe(0);
    expect(summary(run.out), "the summary named a host this run never opened a socket on").not.toContain("evil.example");
    expect(summary(run.out), "the summary named an origin no page was read from").not.toContain("permitrulebook.com");
    const unparsed = await flowRunInProcess("//permitrulebook.com/x?to=a@evil.example", buildDirectoryInMemory());
    expect(unparsed.status, unparsed.out).toBe(0);
    expect(summary(unparsed.out), "the summary showed a value that never parsed").not.toContain("evil.example");
    expect(summary(unparsed.out), "the summary showed a value that never parsed").not.toContain("permitrulebook.com");
    expect(summary(unparsed.out), "the summary says nothing about where it was pointed").toContain("CARRY_ORIGIN");
  });

  it("blames the origin on the counted line only when the origin was what was wrong", async () => {
    // The same line, and the same reason for caring about it: it is what an
    // incident is read from. THREE bails reach it with no page read, and the
    // third is not about the origin at all: a valid `CARRY_ORIGIN` with no
    // build directory has nothing wrong with the variable.
    //
    // The bail that ended the run is the only place that knows which bail it
    // was, so the phrase is decided there and the line prints what it is
    // handed.
    const run = await flowRunInProcess("https://permitrulebook.com/", undefined);
    expect(run.status, run.out).toBe(0);
    expect(summary(run.out), "the origin was blamed for a missing build directory")
      .not.toContain("no page could be read from");
    expect(summary(run.out), "the line does not say what was actually missing").toContain("build directory");
    // And the two bails that ARE about the origin still say so, and still say
    // which of the two: unset is a variable nobody set, and the other is a
    // value that is set and is not somewhere a page can be read from.
    const unset = await flowRunInProcess("", buildDirectoryInMemory());
    expect(summary(unset.out), unset.out).toContain("an unset CARRY_ORIGIN");
    const unreadable = await flowRunInProcess("not a url", buildDirectoryInMemory());
    expect(summary(unreadable.out), unreadable.out).toContain("no page could be read from");
  });

  it("reads the address it checked, whitespace and all", async () => {
    // The value that is checked and the value that is fetched are one string:
    // `CARRY_ORIGIN` with a space at each end is the address without them,
    // not `…/%20%20/`, which would answer 404 with no explanation in it.
    const live = liveSiteInMemory(liveDeployAnswers({ [CSS_NAME]: CSS }));
    const out = buildDirectoryInMemory();
    try {
      const run = await flowRunInProcess(`  ${live.url}/  `, out);
      expect(run.status, run.out).toBe(0);
      expect(live.asked, run.out).toEqual(["/", `/${DIGESTS}`, `/_astro/${CSS_NAME}`]);
      expect(out.assetNames()).toEqual([CSS_NAME]);
    } finally { live.close(); }
  });

  it("refuses four hundred foreign references without a packet or four hundred lines", async () => {
    // The other half of the ceiling: a reference that never becomes a name
    // costs no request, and it costs no line of its own either, because a page
    // is a stranger's string. Neither the network nor the log is the page's to
    // fill.
    const live = liveSiteInMemory({
      "/": {
        type: "text/html; charset=utf-8",
        body: pageOf(Array.from({ length: 400 }, (_, i) => `https://evil.example/_astro/pwn.${i}.js`)),
      },
    });
    const out = buildDirectoryInMemory();
    try {
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      expect(live.asked).toEqual(["/"]);
      expect(out.assetNames()).toEqual([]);
      const lines = run.out.trim().split("\n");
      expect(lines.length, run.out).toBeLessThanOrEqual(25);
    } finally { live.close(); }
  });

  it("refuses a name longer than the filesystem would take, without fetching it", async () => {
    // A 300-character name would make the write throw ENAMETOOLONG — a page
    // could kill the deploy with an attribute.
    const long = `${"a".repeat(300)}.css`;
    const live = liveSiteInMemory({ "/": { type: "text/html; charset=utf-8", body: pageNaming(long) } });
    const out = buildDirectoryInMemory();
    try {
      const run = await flowRunInProcess(live.url, out);
      expect(run.status, run.out).toBe(0);
      // Refused before the request: the page was read and nothing else was.
      expect(live.asked).toEqual(["/"]);
      expect(out.assetNames()).toEqual([]);
    } finally { live.close(); }
  });
});
