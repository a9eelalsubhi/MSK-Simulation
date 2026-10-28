declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    ASSETS?: Fetcher;
    ANALYTICS_OWNER_EMAIL?: string;
  }
}
