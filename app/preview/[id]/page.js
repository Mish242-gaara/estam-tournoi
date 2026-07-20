"use client";

import { useEffect, useState } from "react";
import SiteShell from "../../components/SiteShell";

const previewSeed = {
  title: "Avant le match",
  home: "Filière A",
  away: "Filière B",
  kickoff: "18:00",
  venue: "Stade de la cité universitaire"
};

export default function PreviewPage({ params }) {
  const id = Number(params?.id || 1);
  const [vote, setVote] = useState("");
  const [score, setScore] = useState({ home: "2", away: "1" });
  const [savedVote, setSavedVote] = useState(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(`estam-preview-${id}`);
      if (raw) setSavedVote(JSON.parse(raw));
    } catch {}
  }, [id]);

  function submitVote(e) {
    e.preventDefault();
    const data = { favorite: vote || previewSeed.home, score: `${score.home}-${score.away}` };
    setSavedVote(data);
    window.localStorage.setItem(`estam-preview-${id}`, JSON.stringify(data));
  }

  return (
    <SiteShell title="Pré-match & votes" subtitle="Les supporters peuvent choisir leur favori, prédire le score et préparer l’ambiance avant la rencontre.">
      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <div>
              <div className="eyebrow">Match #{id}</div>
              <h2>{previewSeed.home} vs {previewSeed.away}</h2>
            </div>
            <div className="pill">{previewSeed.kickoff}</div>
          </div>

          <div className="meta-grid">
            <div className="metric-card">
              <span>Lieu</span>
              <strong>{previewSeed.venue}</strong>
            </div>
            <div className="metric-card">
              <span>Ambiance</span>
              <strong>Échange en direct</strong>
            </div>
          </div>

          <form onSubmit={submitVote} className="stack">
            <label className="field">
              <span>Votre favori</span>
              <select value={vote} onChange={e => setVote(e.target.value)}>
                <option value="">Choisir</option>
                <option value={previewSeed.home}>{previewSeed.home}</option>
                <option value={previewSeed.away}>{previewSeed.away}</option>
              </select>
            </label>

            <div className="form-grid">
              <label className="field">
                <span>Score {previewSeed.home}</span>
                <input value={score.home} onChange={e => setScore(s => ({ ...s, home: e.target.value }))} />
              </label>
              <label className="field">
                <span>Score {previewSeed.away}</span>
                <input value={score.away} onChange={e => setScore(s => ({ ...s, away: e.target.value }))} />
              </label>
            </div>

            <button className="btn primary" type="submit">Valider mon vote</button>
          </form>
        </section>

        <section className="card">
          <div className="card-head">
            <h3>Résultat du sondage</h3>
            <div className="pill">{savedVote ? "Enregistré" : "En cours"}</div>
          </div>
          {savedVote ? (
            <div className="stack">
              <div className="metric-card">
                <span>Favori</span>
                <strong>{savedVote.favorite}</strong>
              </div>
              <div className="metric-card">
                <span>Prédiction</span>
                <strong>{savedVote.score}</strong>
              </div>
            </div>
          ) : (
            <p className="muted">Aucun vote enregistré pour le moment. Soyez le premier à participer.</p>
          )}
        </section>
      </div>
    </SiteShell>
  );
}
