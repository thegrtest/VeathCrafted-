"use client";

import { useEffect, useState, type FormEvent } from "react";
import { defaultHomeHero, type HomeHero } from "@/lib/home-hero";

export default function HomeImageManager({ initialHero }: { initialHero: HomeHero }) {
  const [hero, setHero] = useState(initialHero);
  const [alt, setAlt] = useState(initialHero.alt);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [fileKey, setFileKey] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!file) { setPreview(null); return; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  async function save(next: HomeHero) {
    const response = await fetch("/api/admin/home-hero", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(next) });
    const data = await response.json() as { hero?: HomeHero; error?: string };
    if (!response.ok || !data.hero) throw new Error(data.error || "Could not save the homepage photo.");
    setHero(data.hero); setAlt(data.hero.alt); setFile(null); setFileKey((value) => value + 1);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); setError("");
    try {
      let imageUrl = hero.imageUrl;
      if (file) {
        const response = await fetch("/api/admin/photo", { method: "POST", headers: { "Content-Type": file.type }, body: file });
        const data = await response.json().catch(() => ({})) as { url?: string; error?: string };
        if (!response.ok || !data.url) throw new Error(data.error || "Could not upload the photo. Check that it is under 4 MB.");
        imageUrl = data.url;
      }
      await save({ imageUrl, alt: alt.trim() });
      setMessage("Homepage photo saved. View the home page to see it live.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save the homepage photo."); }
    finally { setBusy(false); }
  }

  async function restoreDefault() {
    setBusy(true); setMessage(""); setError("");
    try { await save(defaultHomeHero); setMessage("Default homepage photo restored."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not restore the default photo."); }
    finally { setBusy(false); }
  }

  return <section className="studio-panel studio-home-image" id="homepage-photo">
    <div className="studio-section-head"><div><h2>Homepage photo</h2><p>This is the large image beside “Handmade soap, made for you.” It can be changed without editing the site’s code.</p></div><a className="inline-link" href="/" target="_blank" rel="noreferrer">View home page ↗</a></div>
    <div className="studio-home-image-grid"><div className="studio-home-preview"><img src={preview || hero.imageUrl} alt={alt || hero.alt}/><span>{file ? "New photo preview" : "Current homepage photo"}</span></div>
      <form className="studio-form" onSubmit={submit}>
        <h3>Choose the photo people see first</h3>
        <p className="fine-print">A wide, clear photo works best. The site crops it to fit desktop and phone screens. JPG, PNG, or WebP; under 4 MB.</p>
        <label>Replacement photo <small>Leave blank to update the description only</small><input key={fileKey} type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setFile(event.target.files?.[0] || null)}/></label>
        <label>Image description <small>For visitors using screen readers</small><input required minLength={3} maxLength={160} value={alt} onChange={(event) => setAlt(event.target.value)}/></label>
        <div className="studio-home-actions"><button className="button button-dark" type="submit" disabled={busy}>{busy ? "Saving…" : "Save homepage photo"}</button><button className="quiet-button" type="button" disabled={busy || (hero.imageUrl === defaultHomeHero.imageUrl && alt === defaultHomeHero.alt && !file)} onClick={() => void restoreDefault()}>Restore default</button></div>
        {message && <p className="status success" role="status">{message}</p>}
        {error && <p className="status error" role="alert">{error}</p>}
      </form>
    </div>
  </section>;
}
