declare namespace Cloudflare {
  interface Env {
    DB?: D1Database;
    BUCKET?: R2Bucket;
    RESEND_API_KEY?: string;
    ORDER_EMAIL_FROM?: string;
    ORDER_EMAIL_TO?: string;
    ADMIN_EMAILS?: string;
    STRIPE_SECRET_KEY?: string;
    STRIPE_WEBHOOK_SECRET?: string;
    SHIPPING_CENTS?: string;
    CHECKOUT_ENABLED?: string;
  }
}
