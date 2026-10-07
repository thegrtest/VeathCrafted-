"use client";

import { useState, type FormEvent } from "react";
import type { Ingredient, ReadySoap } from "@/lib/catalog";

const blankIngredient: Ingredient = { id: "", name: "", purpose: "", inBase: false, selectable: true, active: true, sortOrder: 100 };
const blankSoap: ReadySoap = { id: "", name: "", description: "", ingredientsText: "", imageUrl: null, priceCents: 0, stock: 0, active: false };

export default function CatalogManager({ initialIngredients, initialSoaps }: { initialIngredients: Ingredient[]; initialSoaps: ReadySoap[] }) {
  const [ingredients, setIngredients] = useState(initialIngredients);
  const [soaps, setSoaps] = useState(initialSoaps);
  const [ingredient, setIngredient] = useState<Ingredient>(blankIngredient);
  const [soap, setSoap] = useState<ReadySoap>(blankSoap);
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function save(action: object) {
    setBusy(true); setMessage(""); setError("");
    try {
      const response = await fetch("/api/admin/catalog", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(action) });
      const data = await response.json() as { ingredients?: Ingredient[]; soaps?: ReadySoap[]; error?: string };
      if (!response.ok || !data.ingredients || !data.soaps) throw new Error(data.error || "Could not save changes.");
      setIngredients(data.ingredients); setSoaps(data.soaps); setMessage("Saved. The storefront is updated.");
      return true;
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save changes."); return false; }
    finally { setBusy(false); }
  }

  async function saveIngredient(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (await save({ action: "saveIngredient", ...ingredient, id: ingredient.id || undefined })) setIngredient(blankIngredient);
  }

  async function saveSoap(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!/^\d{1,4}(?:\.\d{1,2})?$/.test(price.trim())) { setError("Enter a price such as 12.00. Use 0 for an unpublished draft."); return; }
    const priceCents = Math.round(Number(price) * 100);
    if (await save({ action: "saveSoap", ...soap, id: soap.id || undefined, imageUrl: soap.imageUrl || "", priceCents })) {
      setSoap(blankSoap); setPrice("");
    }
  }

  async function uploadPhoto(file: File | undefined) {
    if (!file) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const body = new FormData(); body.append("photo", file);
      const response = await fetch("/api/admin/photo", { method: "POST", body });
      const data = await response.json() as { url?: string; error?: string };
      if (!response.ok || !data.url) throw new Error(data.error || "Could not upload photo.");
      setSoap((current) => ({ ...current, imageUrl: data.url! }));
      setMessage("Photo uploaded. Save the soap to use it.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not upload photo."); }
    finally { setBusy(false); }
  }

  return <>
    {(message || error) && <p className={`status ${error ? "error" : "success"}`} role="status">{error || message}</p>}
    <div className="studio-grid">
      <section className="studio-panel"><div className="studio-section-head"><div><h2>Ready-made soaps</h2><p>Add a finished batch with its actual ingredients, price, and bars available.</p></div><button type="button" className="quiet-button" onClick={() => { setSoap(blankSoap); setPrice(""); }}>New soap</button></div>
        <div className="studio-list">{soaps.length ? soaps.map((item) => <div className="studio-list-item" key={item.id}><div><strong>{item.name}</strong><small>{item.active ? "Published" : "Unpublished"} · {item.stock} available · ${(item.priceCents / 100).toFixed(2)}</small></div><div><button type="button" onClick={() => { setSoap(item); setPrice((item.priceCents / 100).toFixed(2)); }}>Edit</button>{item.active && <button type="button" disabled={busy} onClick={() => void save({ action: "archiveSoap", id: item.id })}>Remove</button>}</div></div>) : <p className="fine-print">No ready-made soaps yet. The public shop will stay empty until you publish one.</p>}</div>
        <form className="studio-form" onSubmit={saveSoap}><h3>{soap.id ? `Edit ${soap.name}` : "Add a ready-made soap"}</h3>
          <label>Name<input required maxLength={120} value={soap.name} onChange={(event) => setSoap({ ...soap, name: event.target.value })}/></label>
          <label>Short description<textarea maxLength={600} rows={2} value={soap.description} onChange={(event) => setSoap({ ...soap, description: event.target.value })}/></label>
          <label>Actual ingredients <small>One per line, in label order</small><textarea required maxLength={2000} rows={5} value={soap.ingredientsText} onChange={(event) => setSoap({ ...soap, ingredientsText: event.target.value })}/></label>
          <label>Photo <small>Optional JPG, PNG, or WebP under 4 MB</small><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void uploadPhoto(event.target.files?.[0])}/></label>
          {soap.imageUrl && <div className="studio-photo-preview"><img src={soap.imageUrl} alt="Soap listing preview"/><button type="button" onClick={() => setSoap({ ...soap, imageUrl: null })}>Remove photo</button></div>}
          <label>Or paste an HTTPS photo URL <small>Optional</small><input type="text" placeholder="https://…" value={soap.imageUrl ?? ""} onChange={(event) => setSoap({ ...soap, imageUrl: event.target.value })}/></label>
          <div className="studio-pair"><label>Price, USD<input required inputMode="decimal" placeholder="12.00" value={price} onChange={(event) => setPrice(event.target.value)}/></label><label>Bars available<input required type="number" min={0} max={10000} value={soap.stock} onChange={(event) => setSoap({ ...soap, stock: Number(event.target.value) })}/></label></div>
          <label className="studio-check"><input type="checkbox" checked={soap.active} onChange={(event) => setSoap({ ...soap, active: event.target.checked })}/> Publish on storefront</label>
          <button className="button button-dark" disabled={busy} type="submit">Save soap</button>
        </form>
      </section>

      <section className="studio-panel"><div className="studio-section-head"><div><h2>Ingredient choices</h2><p>Control the starting formula and what customers may request or avoid.</p></div><button type="button" className="quiet-button" onClick={() => setIngredient({ ...blankIngredient, sortOrder: (ingredients.at(-1)?.sortOrder ?? 90) + 10 })}>New ingredient</button></div>
        <div className="studio-list">{ingredients.map((item) => <div className="studio-list-item" key={item.id}><div><strong>{item.name}</strong><small>{item.active ? [item.inBase ? "Starting bar" : "Optional", item.selectable ? "Customer choice" : "Information only"].join(" · ") : "Removed from site"}</small></div><div><button type="button" onClick={() => setIngredient(item)}>Edit</button>{item.active && <button type="button" disabled={busy} onClick={() => void save({ action: "archiveIngredient", id: item.id })}>Remove</button>}</div></div>)}</div>
        <form className="studio-form" onSubmit={saveIngredient}><h3>{ingredient.id ? `Edit ${ingredient.name}` : "Add an ingredient"}</h3>
          <label>Name<input required maxLength={100} value={ingredient.name} onChange={(event) => setIngredient({ ...ingredient, name: event.target.value })}/></label>
          <label>What it does<input maxLength={240} value={ingredient.purpose} onChange={(event) => setIngredient({ ...ingredient, purpose: event.target.value })}/></label>
          <label className="studio-check"><input type="checkbox" checked={ingredient.inBase} onChange={(event) => setIngredient({ ...ingredient, inBase: event.target.checked })}/> In the starting bar</label>
          <label className="studio-check"><input type="checkbox" checked={ingredient.selectable} onChange={(event) => setIngredient({ ...ingredient, selectable: event.target.checked })}/> Let customers request or avoid it</label>
          <label className="studio-check"><input type="checkbox" checked={ingredient.active} onChange={(event) => setIngredient({ ...ingredient, active: event.target.checked })}/> Show on storefront</label>
          <label>Display order<input type="number" min={0} max={10000} value={ingredient.sortOrder} onChange={(event) => setIngredient({ ...ingredient, sortOrder: Number(event.target.value) })}/></label>
          <button className="button button-dark" disabled={busy} type="submit">Save ingredient</button>
        </form>
      </section>
    </div>
  </>;
}
