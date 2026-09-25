"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, MapPin } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { shopContent } from "@/lib/shop-content";

type Supplier = { id: string; name: string; areaType: string | null };
type Lookup = { suppliers: Supplier[]; place: string | null; approximate: boolean };
type WaterQuality = { sourceWater: string | null; quartersWithViolations: number | null; detailedReport: string | null };
type WaterSource = "public" | "private-well" | "softened" | "unknown";
type HardnessUnit = "mg/L" | "gpg";
type ReadingSource = "tap-test" | "utility-report" | "unsure";

const waterFeelOptions = [
  { id: "low-lather", label: "Soap barely lathers" },
  { id: "residue", label: "Film or residue after rinsing" },
  { id: "slippery", label: "Rinse feels slippery" },
] as const;

function hardnessCategory(value: number | null) {
  if (value === null) return null;
  if (value <= 60) return "Soft";
  if (value <= 120) return "Moderately hard";
  if (value <= 180) return "Hard";
  return "Very hard";
}

export default function Experience() {
  const [zip, setZip] = useState("");
  const lookupRequest = useRef(0);
  const [lookup, setLookup] = useState<Lookup | null>(null);
  const [lookupError, setLookupError] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [manualSupplier, setManualSupplier] = useState("");
  const [quality, setQuality] = useState<WaterQuality | null>(null);
  const [qualityBusy, setQualityBusy] = useState(false);
  const [qualityError, setQualityError] = useState("");
  const [hardnessText, setHardnessText] = useState("");
  const [hardnessUnit, setHardnessUnit] = useState<HardnessUnit>("mg/L");
  const [readingSource, setReadingSource] = useState<ReadingSource>("unsure");
  const [waterFeel, setWaterFeel] = useState<string[]>([]);
  const [waterSource, setWaterSource] = useState<WaterSource>("unknown");
  const [scent, setScent] = useState<string>(shopContent.scents[0].id);
  const [texture, setTexture] = useState<string>(shopContent.textures[0].id);
  const [quantity, setQuantity] = useState(2);
  const [notes, setNotes] = useState("");
  const [consultationRequested, setConsultationRequested] = useState(false);
  const [consultationNotes, setConsultationNotes] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [deliveryZip, setDeliveryZip] = useState("");
  const [orderBusy, setOrderBusy] = useState(false);
  const [orderError, setOrderError] = useState("");
  const [orderId, setOrderId] = useState("");
  const [savedConsultationRequested, setSavedConsultationRequested] = useState(false);

  const reading = hardnessText === "" ? null : Number(hardnessText);
  const hardness = reading !== null && Number.isFinite(reading) && reading >= 0
    ? Math.round(reading * (hardnessUnit === "gpg" ? 17.1 : 1)) : null;
  const readingIsValid = hardnessText === "" || (reading !== null && Number.isFinite(reading) && reading >= 0 && reading <= (hardnessUnit === "gpg" ? 58 : 1000));
  const category = readingIsValid && hardness !== null ? hardnessCategory(hardness) : null;
  const latherNote = waterSource === "softened"
    ? "Home softening can change the water after your utility measures it. If your reading is from before the softener, test the tap you use when washing."
    : category === "Hard" || category === "Very hard"
      ? "Minerals can make soap lather less and leave residue. Tell us how much lather and rinse feel you prefer so we can discuss the formula."
      : category === "Soft"
        ? "Soap often lathers easily in soft water. If rinsing feels slippery, try less soap and tell us the finish you prefer."
        : category === "Moderately hard"
          ? "Your reading suggests some minerals, but the feel at your tap matters most. Tell us what you notice when you wash."
          : "We will not guess your hardness from a ZIP code or utility name. A tap test or a utility reading gives us a useful starting point.";

  function chooseSupplier(next: Supplier | null) {
    if (supplier?.id === next?.id) return;
    setSupplier(next);
    setQuality(null);
    setQualityError("");
    setQualityBusy(Boolean(next));
  }

  useEffect(() => {
    if (!supplier) return;
    const controller = new AbortController();
    void fetch(`/api/water-quality?pwsid=${encodeURIComponent(supplier.id)}`, { signal: controller.signal })
      .then(async (response) => {
        const data = await response.json() as WaterQuality & { error?: string };
        if (!response.ok) throw new Error(data.error ?? "EPA data is unavailable.");
        if (!controller.signal.aborted) setQuality(data);
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) setQualityError(error instanceof Error ? error.message : "EPA data is unavailable.");
      })
      .finally(() => { if (!controller.signal.aborted) setQualityBusy(false); });
    return () => controller.abort();
  }, [supplier]);

  useEffect(() => {
    type ToolContext = { registerTool: (tool: {
      name: string; title: string; description: string; inputSchema: object;
      annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
      execute: (input: unknown) => Promise<unknown>;
    }, options: { signal: AbortSignal }) => void | Promise<void> };
    const context = (document as Document & { modelContext?: ToolContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();
    try {
      void Promise.resolve(context.registerTool({
        name: "set_soap_preferences",
        title: "Set soap preferences",
        description: "Set the visible bar quantity and optional measured water hardness for a custom soap request.",
        inputSchema: { type: "object", properties: {
          quantity: { type: "integer", minimum: 1, maximum: 24 },
          hardness: { type: "integer", minimum: 0, maximum: 1000 },
        }, required: ["quantity"], additionalProperties: false },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        async execute(input) {
          const value = input as { quantity?: number; hardness?: number };
          if (!Number.isInteger(value.quantity) || value.quantity! < 1 || value.quantity! > 24 ||
              (value.hardness !== undefined && (!Number.isInteger(value.hardness) || value.hardness < 0 || value.hardness > 1000))) {
            throw new Error("Enter 1–24 bars and a valid optional hardness reading.");
          }
          setQuantity(value.quantity!);
          if (value.hardness !== undefined) { setHardnessUnit("mg/L"); setHardnessText(String(value.hardness)); }
          await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
          return { quantity: value.quantity, hardness: value.hardness ?? null };
        },
      }, { signal: lifecycle.signal })).catch(() => {});
    } catch {}
    return () => lifecycle.abort();
  }, []);

  async function findWater(query: string) {
    const requestNumber = ++lookupRequest.current;
    setLookupBusy(true); setLookupError(""); setLookup(null); chooseSupplier(null);
    try {
      const response = await fetch(`/api/water?${query}`);
      const data = await response.json() as Lookup & { error?: string };
      if (!response.ok) throw new Error(data.error ?? "We could not complete the lookup.");
      if (requestNumber !== lookupRequest.current) return;
      setLookup(data);
    } catch (error) {
      if (requestNumber === lookupRequest.current) setLookupError(error instanceof Error ? error.message : "Lookup unavailable.");
    } finally {
      if (requestNumber === lookupRequest.current) setLookupBusy(false);
    }
  }

  function useLocation() {
    if (!navigator.geolocation) { setLookupError("Location is unavailable. Enter a ZIP code instead."); return; }
    setLookupBusy(true); setLookupError("");
    navigator.geolocation.getCurrentPosition(
      (position) => void findWater(new URLSearchParams({
        lat: String(position.coords.latitude), lon: String(position.coords.longitude),
      }).toString()),
      () => { setLookupBusy(false); setLookupError("Location access was unavailable. Enter a ZIP code instead."); },
      { enableHighAccuracy: false, timeout: 10000 },
    );
  }

  async function submitOrder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setOrderBusy(true); setOrderError(""); setOrderId("");
    if (!readingIsValid) { setOrderError("Review your hardness reading before sending the request."); setOrderBusy(false); return; }
    try {
      const website = new FormData(event.currentTarget).get("companyWebsite")?.toString() ?? "";
      const waterDetails = [
        lookup?.approximate && /^\d{5}$/.test(zip) ? `Water lookup ZIP: ${zip}` : null,
        category && readingSource !== "unsure" ? `Hardness reading from: ${readingSource === "tap-test" ? "home tap test" : "utility report"}` : null,
        waterFeel.length ? `At the tap: ${waterFeelOptions.filter((item) => waterFeel.includes(item.id)).map((item) => item.label.toLowerCase()).join(", ")}` : null,
      ].filter(Boolean).join("; ");
      const response = await fetch("/api/orders", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName, customerEmail, deliveryZip,
          base: shopContent.product.id, scent, texture, quantity,
          hardness: category ? hardness : null,
          waterSupplier: supplier ? `${supplier.name.slice(0, 180)} (EPA ${supplier.id})` : manualSupplier.trim() || null, waterSource,
          notes: [waterDetails, notes.trim()].filter(Boolean).join("\n"),
          consultationRequested, consultationNotes: consultationRequested ? consultationNotes : "", website,
        }) });
      const data = await response.json() as { id?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "We could not save your request.");
      setOrderId(data.id ?? "");
      setSavedConsultationRequested(consultationRequested);
    } catch (error) {
      setOrderError(error instanceof Error ? error.message : "We could not save your request.");
    } finally {
      setOrderBusy(false);
    }
  }

  return <>
    <section className="step-section" id="water">
      <div className="step-heading"><span className="step-number">01</span><div><h2>Start with your water.</h2><p>Tell us what reaches your tap. A supplier match gives context; your own hardness reading and washing experience help us discuss the right bar.</p></div></div>
      <div className="water-grid">
        <div className="panel">
          <h3>Find a possible supplier</h3>
          <p>Enter a US ZIP code or share your location. You choose the match that is actually on your water bill.</p>
          <form onSubmit={(event) => { event.preventDefault(); void findWater(new URLSearchParams({ zip }).toString()); }}>
            <label className="field-label" htmlFor="zip">ZIP code</label>
            <div className="zip-row">
              <Input id="zip" className="form-input" inputMode="numeric" pattern="[0-9]{5}" required maxLength={5} placeholder="e.g. 60614" value={zip}
                onChange={(event) => { lookupRequest.current++; setZip(event.target.value.replace(/\D/g, "")); setLookup(null); chooseSupplier(null); setLookupBusy(false); }}/>
              <button type="submit" className="button button-dark" disabled={lookupBusy}>{lookupBusy ? "Checking…" : "Find supply"}</button>
            </div>
          </form>
          <button type="button" className="quiet-button" onClick={useLocation} disabled={lookupBusy}><MapPin size={16}/> Use my location</button>
          {lookupError && <p className="status error" role="alert">{lookupError}</p>}
          {lookup && <div className="supplier-results" aria-live="polite">
            <strong>{lookup.place ? `Possible suppliers near ${lookup.place}` : "Possible suppliers near you"}</strong>
            {lookup.suppliers.length ? lookup.suppliers.map((item) => <button key={item.id} type="button"
              className={supplier?.id === item.id ? "supplier selected" : "supplier"}
              aria-pressed={supplier?.id === item.id}
              onClick={() => { chooseSupplier(item); setManualSupplier(""); if (waterSource !== "softened") setWaterSource("public"); }}>
              <span>{item.name}<small>EPA ID {item.id}</small></span>{supplier?.id === item.id && <Check size={18}/>}
            </button>) : <p>No mapped public supplier was found. You may use a private well or an unmapped system.</p>}
            <p className="fine-print">Select a supplier only after checking your bill. {lookup.approximate ? "A ZIP points to an approximate area, not your address. " : "Mapped boundaries can overlap. "}No match means the map cannot identify your supply; it does not mean your water is unsafe.</p>
          </div>}
          {supplier && <div className="quality-snapshot" aria-live="polite">
            <h4>Public system context</h4>
            {qualityBusy && <p>Checking EPA water-quality records…</p>}
            {qualityError && <p>{qualityError}</p>}
            {quality && <>
              {quality.sourceWater && <div className="quality-row"><span>Primary source</span><strong>{quality.sourceWater}</strong></div>}
              <p className="fine-print">This EPA record describes the public system. It cannot tell us the hardness or quality at your tap after plumbing or home treatment.</p>
              {quality.detailedReport && <a className="inline-link" href={quality.detailedReport} target="_blank" rel="noreferrer">View EPA system report <ArrowRight size={15}/></a>}
              {quality.quartersWithViolations !== null && <details className="quality-details"><summary>About EPA compliance history</summary><p>EPA lists {quality.quartersWithViolations} quarter{quality.quartersWithViolations === 1 ? "" : "s"} with reported violations over the past three years. These may include monitoring or reporting issues. This count is not a water safety score or a soap recommendation; use the full report for context.</p></details>}
            </>}
          </div>}
          <label className="field-label" htmlFor="manual-supplier">Your utility not listed? <span>Optional</span></label>
          <Input id="manual-supplier" className="form-input" maxLength={160} placeholder="Enter the name on your water bill" value={manualSupplier} onChange={(event) => { setManualSupplier(event.target.value); if (event.target.value) { chooseSupplier(null); if (waterSource !== "softened") setWaterSource("public"); } }}/>
          {manualSupplier && <p className="fine-print water-help">We will use the name you enter. The EPA system snapshot above needs a mapped system ID.</p>}
        </div>
        <div className="panel panel-tint">
          <h3>Describe your tap</h3>
          <p>A home softener or private well can make your tap different from the public system nearby.</p>
          <label className="field-label" htmlFor="tap-source">Water used when you wash</label>
          <Select value={waterSource} onValueChange={(value) => { const next = value as WaterSource; setWaterSource(next); if (next === "private-well" || next === "unknown") { chooseSupplier(null); setManualSupplier(""); } }}><SelectTrigger id="tap-source" className="shop-select"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="unknown">Not sure yet</SelectItem><SelectItem value="public">Public utility, no home softener</SelectItem><SelectItem value="private-well">Private well</SelectItem><SelectItem value="softened">Home softened water</SelectItem></SelectContent></Select>
          {waterSource === "softened" && <p className="fine-print water-help">If you have a utility, keep its supplier selected for context. A reading before the softener may not describe the water at your tap.</p>}
          {waterSource === "private-well" && <p className="fine-print water-help">A public supplier map cannot describe a private well. <a href="https://www.epa.gov/privatewells/protect-your-homes-water" target="_blank" rel="noreferrer">EPA explains how to test well water.</a></p>}
          <div className="hardness-entry">
            <label className="field-label" htmlFor="hardness">Hardness reading <span>Optional</span></label>
            <div className="hardness-input-row"><Input id="hardness" className="form-input" type="number" min="0" max={hardnessUnit === "gpg" ? "58" : "1000"} step={hardnessUnit === "gpg" ? "0.1" : "1"} placeholder={hardnessUnit === "gpg" ? "e.g. 8" : "e.g. 150"} value={hardnessText} onChange={(event) => setHardnessText(event.target.value)}/><select className="unit-select" aria-label="Hardness unit" value={hardnessUnit} onChange={(event) => { setHardnessUnit(event.target.value as HardnessUnit); setHardnessText(""); }}><option value="mg/L">mg/L as CaCO₃</option><option value="gpg">grains/gal</option></select></div>
            {!readingIsValid && <p className="status error" role="alert">Enter a reading between 0 and 1,000 mg/L, or up to 58 grains per gallon.</p>}
            {category && hardness !== null && <div className="hardness-result"><strong>{category} reading</strong><span>{hardness} mg/L · {(hardness / 17.1).toFixed(1)} grains/gal</span></div>}
            <label className="field-label" htmlFor="reading-source">Where did this reading come from?</label>
            <Select value={readingSource} onValueChange={(value) => setReadingSource(value as ReadingSource)}><SelectTrigger id="reading-source" className="shop-select"><SelectValue/></SelectTrigger><SelectContent><SelectItem value="unsure">Not sure / no reading</SelectItem><SelectItem value="tap-test">Tested at my tap</SelectItem><SelectItem value="utility-report">Utility report</SelectItem></SelectContent></Select>
            {readingSource === "utility-report" && <p className="fine-print water-help">A utility figure is a starting point. Your tap may differ, especially after a home softener.</p>}
          </div>
          <a className="inline-link water-report-link" href="https://www.epa.gov/ccr" target="_blank" rel="noreferrer">Find your annual utility water report <ArrowRight size={15}/></a>
        </div>
      </div>
      <div className="water-profile" aria-live="polite"><div><span className="profile-kicker">Your water profile</span><h3>{category ? `${category} ${readingSource === "tap-test" ? "at your tap" : readingSource === "utility-report" ? "utility reading" : "hardness reading"}` : waterSource === "softened" ? "Home softened water" : "A little more to learn"}</h3><p>{latherNote}</p></div><div className="water-feel"><strong>What do you notice when washing?</strong><p>Choose any that apply. Your experience helps us discuss the recipe.</p>{waterFeelOptions.map((item) => <label key={item.id}><input type="checkbox" checked={waterFeel.includes(item.id)} onChange={(event) => setWaterFeel((current) => event.target.checked ? [...current, item.id] : current.filter((id) => id !== item.id))}/>{item.label}</label>)}</div></div>
      <p className="source-note">Supplier candidates come from <a href="https://www.epa.gov/ground-water-and-drinking-water/public-water-system-service-areas" target="_blank" rel="noreferrer">EPA service-area data</a>; public system details from <a href="https://echo.epa.gov/tools/web-services/facility-search-drinking-water" target="_blank" rel="noreferrer">EPA ECHO</a>. Hardness ranges and soap behavior follow <a href="https://www.usgs.gov/water-science-school/science/hardness-water" target="_blank" rel="noreferrer">USGS guidance</a>. One grain per gallon is about 17.1 mg/L as CaCO₃. Supplier and ZIP matches do not measure your tap water.</p>
    </section>

    <section className="step-section ingredients-section" id="ingredients">
      <div className="step-heading"><span className="step-number">02</span><div><h2>Know every ingredient.</h2><p>This simple starting bar can change to fit your preferences and water. We will share exact amounts and the final ingredient list before making it.</p></div></div>
      <div className="ingredient-list" role="list">{shopContent.product.ingredients.map((ingredient) => <div className="ingredient-row" role="listitem" key={ingredient.name}><strong>{ingredient.name}</strong><span>{ingredient.purpose}</span></div>)}</div>
      <p className="ingredient-footnote">Scent, texture, and any agreed water adjustments may add or change ingredients. Sodium hydroxide is used during soapmaking.</p>
    </section>

    <section className="step-section request-section" id="request">
      <div className="request-intro"><div className="step-heading"><span className="step-number">03</span><div><h2>Make it yours.</h2><p>Tell us what you like and what to avoid. We will confirm the recipe and total with you before production.</p></div></div>
        <div className="request-summary"><strong>{shopContent.product.name}</strong><span>Made to order · starting at ${(shopContent.product.startingPriceCents / 100).toFixed(0)} per bar</span><span>At your tap: {waterSource === "public" ? "public utility" : waterSource === "private-well" ? "private well" : waterSource === "softened" ? "home softened" : "not sure"}</span>{(supplier || manualSupplier.trim()) && <span>Supplier: {supplier?.name ?? manualSupplier.trim()}</span>}{category && <span>Hardness reading: {category.toLowerCase()} · {hardness} mg/L</span>}</div>
      </div>
      <form className="order-form" onSubmit={submitOrder}>
        <div className="form-trap" aria-hidden="true"><label htmlFor="company-website">Company website</label><input id="company-website" name="companyWebsite" tabIndex={-1} autoComplete="off"/></div>
        <div className="form-grid">
          <div><label className="field-label" htmlFor="scent">Scent</label><Select value={scent} onValueChange={setScent}><SelectTrigger id="scent" className="shop-select"><SelectValue/></SelectTrigger><SelectContent>{shopContent.scents.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent></Select></div>
          <div><label className="field-label" htmlFor="texture">Texture</label><Select value={texture} onValueChange={setTexture}><SelectTrigger id="texture" className="shop-select"><SelectValue/></SelectTrigger><SelectContent>{shopContent.textures.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent></Select></div>
          <div><label className="field-label" htmlFor="quantity">Number of bars</label><Input id="quantity" className="form-input" type="number" min="1" max="24" required value={quantity} onChange={(event) => setQuantity(Number(event.target.value))}/></div>
        </div>
        <label className="field-label" htmlFor="notes">Ingredients to avoid or other requests</label>
        <textarea id="notes" maxLength={1000} rows={3} placeholder="What would make this bar right for you?" value={notes} onChange={(event) => setNotes(event.target.value)}/>
        <div className="consultation-option">
          <label htmlFor="consultation"><input id="consultation" type="checkbox" checked={consultationRequested} onChange={(event) => setConsultationRequested(event.target.checked)}/><span><strong>I&apos;d like a soap consultation first</strong><small>Talk through your water, ingredients, and preferences before we settle on a recipe.</small></span></label>
          {consultationRequested && <div className="consultation-details"><label className="field-label" htmlFor="consultation-notes">What would you like to discuss? <span>Optional</span></label><textarea id="consultation-notes" maxLength={600} rows={3} placeholder="Questions about water, ingredients, skin feel, or anything else…" value={consultationNotes} onChange={(event) => setConsultationNotes(event.target.value)}/><p className="fine-print">We will use your email to arrange the conversation. No appointment is booked yet.</p></div>}
        </div>
        <div className="form-divider"/>
        <div className="form-grid">
          <div><label className="field-label" htmlFor="customer-name">Name</label><Input id="customer-name" className="form-input" autoComplete="name" minLength={2} maxLength={120} required value={customerName} onChange={(event) => setCustomerName(event.target.value)}/></div>
          <div><label className="field-label" htmlFor="customer-email">Email</label><Input id="customer-email" className="form-input" type="email" autoComplete="email" required value={customerEmail} onChange={(event) => setCustomerEmail(event.target.value)}/></div>
          <div><label className="field-label" htmlFor="delivery-zip">Delivery ZIP</label><Input id="delivery-zip" className="form-input" inputMode="numeric" pattern="[0-9]{5}" maxLength={5} required value={deliveryZip} onChange={(event) => setDeliveryZip(event.target.value.replace(/\D/g, ""))}/></div>
        </div>
        <div className="order-total"><span>Starting bars estimate <small>Shipping and custom changes confirmed in your quote</small></span><strong>${((shopContent.product.startingPriceCents * (Number.isFinite(quantity) ? quantity : 0)) / 100).toFixed(2)}</strong></div>
        <button className="button button-dark submit-button" type="submit" disabled={orderBusy}>{orderBusy ? "Saving…" : consultationRequested ? "Request consultation & bar" : "Request your bar"} <ArrowRight size={18}/></button>
        <p className="fine-print">This is a request, not a purchase. No payment is collected.</p>
        {orderError && <p className="status error" role="alert">{orderError}</p>}
        {orderId && <div className="status success" role="status"><Check size={20}/><span>Request saved. Reference {orderId.slice(0, 8).toUpperCase()}. {savedConsultationRequested ? "Your consultation request is included. We will use your email to arrange the conversation and discuss the formula and quote." : "We will use your email to discuss the final formula and quote."}</span></div>}
      </form>
    </section>
    <footer className="site-footer"><strong>{shopContent.name}</strong><span>Soap tailored to you, down to the water.</span><nav aria-label="Footer"><a href="mailto:daughertybrad56@gmail.com">Contact</a><a href="/privacy">Privacy</a></nav></footer>
  </>;
}
