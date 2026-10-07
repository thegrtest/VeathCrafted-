"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import type { ReadySoap } from "@/lib/catalog";
import { shopContent } from "@/lib/shop-content";

export default function ReadyMadeShop({ soaps, checkoutReady }: { soaps: ReadySoap[]; checkoutReady: boolean }) {
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");

  async function startCheckout(soapId: string) {
    setBusyId(soapId); setError("");
    try {
      const response = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ soapId, quantity: 1 }) });
      const data = await response.json() as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || "Checkout is unavailable right now.");
      window.location.assign(data.url);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Checkout is unavailable right now."); setBusyId(""); }
  }

  if (!soaps.length) return null;
  return <section className="ready-section" id="ready-soaps"><div className="ready-heading"><p className="eyebrow">AVAILABLE NOW</p><h2>Current batches.</h2><p>Each bar has its own ingredient list and price.</p></div>
    {error && <p className="status error" role="alert">{error}</p>}
    <div className="ready-grid">{soaps.map((soap) => <article className="ready-card" key={soap.id}>
      {soap.imageUrl ? <img src={soap.imageUrl} alt={`${soap.name} soap bar`}/> : <div className="ready-placeholder" role="img" aria-label="Handmade soap"/>}
      <div className="ready-card-body"><span className="ready-stock">{soap.stock} bar{soap.stock === 1 ? "" : "s"} available</span><h3>{soap.name}</h3>{soap.description && <p>{soap.description}</p>}
        <div className="ready-ingredients"><strong>Made with</strong><span>{soap.ingredientsText.split(/\r?\n/).map((item) => item.trim()).filter(Boolean).join(" · ")}</span></div>
        <div className="ready-purchase"><strong>${(soap.priceCents / 100).toFixed(2)}</strong>{checkoutReady ? <button type="button" className="button button-dark" disabled={Boolean(busyId)} onClick={() => void startCheckout(soap.id)}>{busyId === soap.id ? "Opening…" : "Buy this bar"} <ArrowRight size={16}/></button> : <a className="button button-dark" href={`mailto:${shopContent.contactEmail}?subject=${encodeURIComponent(`Ready-made soap: ${soap.name}`)}`}>Ask about this bar <ArrowRight size={16}/></a>}</div>
      </div>
    </article>)}</div>
    {!checkoutReady && <p className="ready-setup-note">Online checkout is being set up. You can ask us about any listed batch by email.</p>}
  </section>;
}
