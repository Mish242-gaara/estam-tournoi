"use client";

import { useState } from "react";

export default function BootstrapAdminPage() {
  const [form, setForm] = useState({ pin: "", name: "", email: "", password: "" });
  const [msg, setMsg] = useState(null);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(null);
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/bootstrap-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-admin-pin": form.pin },
        body: JSON.stringify({ name: form.name, email: form.email, password: form.password })
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Erreur inconnue.");
      } else {
        setMsg(`Compte administrateur créé pour ${data.user.email}. Vous pouvez maintenant vous connecter depuis la page d'accueil.`);
      }
    } catch (e2) {
      setErr("Erreur de connexion au serveur.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <form onSubmit={submit} className="modal" style={{ maxWidth: 380 }}>
        <h3>Créer le premier compte administrateur</h3>
        <p>Cette page n'est utile qu'une seule fois, pour amorcer le site. Elle nécessite le code organisateur (`ADMIN_PIN`) défini dans les variables d'environnement Vercel.</p>
        <input type="password" placeholder="Code organisateur (ADMIN_PIN)" value={form.pin} onChange={e => setForm({ ...form, pin: e.target.value })} required />
        <input type="text" placeholder="Nom" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        <input type="email" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
        <input type="password" placeholder="Mot de passe (6 caractères min.)" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
        {err && <div className="modal-err">{err}</div>}
        {msg && <div style={{ color: "#38b876", fontSize: 13, marginBottom: 8 }}>{msg}</div>}
        <div className="modal-actions">
          <button type="submit" className="btn primary" disabled={loading}>{loading ? "Création…" : "Créer le compte admin"}</button>
        </div>
      </form>
    </div>
  );
}
