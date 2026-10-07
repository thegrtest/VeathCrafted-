import { shopContent } from "@/lib/shop-content";

export default function PrivacyPage() {
  return <main className="privacy-page">
    <a className="inline-link" href="/">← Veath Crafted</a>
    <h1>Privacy</h1>
    <p>When you request a custom soap or consultation, we collect the details you enter, including your name, email, delivery ZIP, ingredient preferences, optional water information, and notes. We use them to prepare a quote and respond to you.</p>
    <p>If you buy a ready-made bar, checkout takes place on Stripe. Stripe collects payment and shipping details. We receive the order status, contact email, shipping name and address, and purchased item so we can fulfill the order. This website does not receive your card number.</p>
    <p>If you use the water lookup, your ZIP code or shared location is used to look for public water systems through outside data services. A matched system ID is used to retrieve EPA water records. You can skip the lookup and still send a request.</p>
    <p>Requests and order records are stored with our website hosting provider. We send owner notifications through Resend to our two business inboxes when available. We do not sell the details you submit. To ask about or request removal of your information, email <a href={`mailto:${shopContent.contactEmail}`}>{shopContent.contactEmail}</a>.</p>
  </main>;
}
