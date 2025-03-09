/// <reference types="vite/client" />

interface ImportMetaEnv {
    VITE_SUPABASE_URL: string;
    VITE_SUPABASE_PUBLIC_KEY: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
