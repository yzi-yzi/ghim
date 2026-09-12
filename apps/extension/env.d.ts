interface ImportMetaEnv {
  readonly WXT_PUBLIC_GHIM_API_URL: string;
  readonly WXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
  readonly WXT_PUBLIC_SUPABASE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
