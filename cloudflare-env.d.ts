declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    RESEND_API_KEY?: string;
    ORDER_EMAIL_FROM?: string;
    ORDER_EMAIL_TO?: string;
  }
}
