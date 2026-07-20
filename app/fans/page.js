"use client";

import { useEffect, useState } from "react";
import SiteShell from "../components/SiteShell";

export default function FansPage() {
  const [fanName, setFanName] = useState("");
  const [savedFan, setSavedFan] = useState(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("estam-fan");
      if (raw) setSavedFan(JSON.parse(raw));
    } catch {}
  }, []);

  function saveFan(e) {
    e.preventDefault();
    const payload = { name: fanName || "Fan", notifications: true, favoriteTeam: "Filière A" };
    setSavedFan(payload);
    window.localStorage.setItem("estam-fan", JSON.stringify(payload));
  }

  return (
    <SiteShell title="Espace fans" subtitle="Créer un compte fan, recevoir les notifications et échanger avant les matchs.">
      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <h3>Créer votre compte fan</h3>
            <div className="pill">Notifications activées</div>
          </div>
          <form onSubmit={saveFan} className="stack">
            <label className="field">
              <span>Nom</span>
              <input value={fanName} onChange={e => setFanName(e.target.value)} placeholder="Votre nom" />
            </label>
            <button className="btn primary" type="submit">Créer mon compte</button>
          </form>
        </section>

        <section className="card">
          <div className="card-head">
            <h3>Profil fan</h3>
            <div className="pill">Connecté</div>
          </div>
          {savedFan ? (
            <div className="stack">
              <div className="metric-card">
                <span>Nom</span>
                <strong>{savedFan.name}</strong>
              </div>
              <div className="metric-card">
                <span>Favori</span>
                <strong>{savedFan.favoriteTeam}</strong>
              </div>
            </div>
          ) : (
            <p className="muted">Aucun profil enregistré.</p>
          )}
        </section>
      </div>
    </SiteShell>
  );
}
