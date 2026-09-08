/// <reference types="astro/client" />

/**
 * `import.meta.env.SITE` and `import.meta.env.BASE_URL` are what the site reads
 * to know where it lives. They have to be written in exactly that form: Vite
 * replaces the literal member expression at build time, and a dynamic read —
 * `(import.meta as {...}).env?.BASE_URL` — is not replaced, so it silently
 * returned nothing in one build and the whole site came out root-based
 * (2026-09-08).
 */
interface ImportMetaEnv {
  readonly SITE?: string;
  readonly BASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
