"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";

const EVENT_TYPES = [
  { key: "goal", label: "But", icon: "⚽" },
  { key: "yellow", label: "Carton jaune", icon: "🟨" },
  { key: "red", label: "Carton rouge", icon: "🟥" },
  { key: "substitution", label: "Remplacement", icon: "🔁" },
  { key: "info", label: "Info (mi-temps, coup d'envoi…)", icon: "ℹ️" }
];

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

const PHASE_LABELS = {
  finale_pn: "Finale Pointe-Noire",
  finale_generale: "Grande Finale",
  demi: "Demi-finale",
  quarts: "Quart de finale",
  huitiemes: "Huitième de finale",
  seiziemes: "Seizième de finale"
};
function phaseLabelFor(m) {
  if (!m || !m.phase || m.phase === "groupes") return `Groupe ${m?.group || "?"}`;
  return PHASE_LABELS[m.phase] || m.group || m.phase;
}

export default function MatchPage({ params }) {
  const matchId = params.id;
  const [match, setMatch] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [toast, setToast] = useState({ show: false, msg: "", error: false });
  const toastTimer = useRef(null);

  const showToast = useCallback((msg, error = false) => {
    setToast({ show: true, msg, error });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 2400);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/matches/${matchId}`);
      if (res.status === 404) { setNotFound(true); return; }
      const data = await res.json();
      setMatch(data);
    } catch (e) {
      // échec silencieux, on retentera au prochain cycle
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    load();
    fetch("/api/auth/me").then(r => r.json()).then(d => setUser(d.user)).catch(() => {});
  }, [load]);

  // Rafraîchissement rapide sur la page dédiée (page focalisée sur un seul match)
  useEffect(() => {
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [load]);

  const isAdmin = user?.role === "admin";

  async function apiMutate(path, method, body) {
    const res = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    if (res.status === 401) {
      setUser(null);
      showToast("Session expirée, reconnectez-vous.", true);
      throw new Error("unauthorized");
    }
    if (!res.ok) {
      showToast("Une erreur est survenue.", true);
      throw new Error("mutation failed");
    }
    return res.status === 204 ? null : res.json();
  }

  async function updateMatch(patch) {
    if (!match) return;
    const updated = { ...match, ...patch };
    setMatch(updated);
    try {
      await apiMutate(`/api/matches/${matchId}`, "PUT", updated);
    } catch (e) {
      load();
    }
  }

  async function addEvent(payload) {
    try {
      const data = await apiMutate("/api/events", "POST", { matchId: Number(matchId), ...payload });
      setMatch(m => ({ ...data.match, events: [...(m.events || []), data.event].sort((a, b) => a.minute - b.minute) }));
      showToast("Événement ajouté");
    } catch (e) {}
  }

  async function deleteEvent(eventId) {
    try {
      const data = await apiMutate(`/api/events/${eventId}`, "DELETE");
      setMatch(m => ({ ...(data?.match || m), events: (m.events || []).filter(e => e.id !== eventId) }));
    } catch (e) {}
  }

  if (loading) {
    return <div className="match-page-status">Chargement…</div>;
  }
  if (notFound || !match) {
    return (
      <div className="match-page-status">
        Match introuvable. <Link href="/">← Retour au site</Link>
      </div>
    );
  }

  const isLive = match.status === "live";
  const isKnockout = match.phase && match.phase !== "groupes";
  const hasScore = match.scoreA !== null && match.scoreA !== undefined && match.scoreB !== null && match.scoreB !== undefined;
  const statusLabel = match.status === "live" ? "En direct" : match.status === "done" ? "Terminé" : "À venir";
  const events = (match.events || []).slice().sort((a, b) => a.minute - b.minute);

  return (
    <div className="match-page">
      <div className="wrap">
        <Link href="/" className="back-link">← Retour au site</Link>

        <div className={`live-hero${isLive ? " is-live" : ""}`}>
          <div className="live-hero-top">
            <span className="tag">{phaseLabelFor(match)}</span>
            <span className={`tag ${match.status === "done" ? "status-done" : match.status === "live" ? "status-live" : "status-upcoming"}`}>
              {isLive && <span className="live-dot" />}
              {isLive ? `${match.minute ?? 0}' — ${statusLabel}` : statusLabel}
            </span>
          </div>
          <div className="live-hero-score">
            <div className="live-hero-team">{match.teamA}</div>
            <div className="live-hero-score-num">{hasScore ? match.scoreA : "–"} <span>–</span> {hasScore ? match.scoreB : "–"}</div>
            <div className="live-hero-team">{match.teamB}</div>
          </div>
          <div className="live-hero-meta">{formatDate(match.date)} · {match.time} · {phaseLabelFor(match)}</div>

          {isKnockout && match.winner && (
            <div className="winner-note" style={{ marginTop: 12, borderRadius: "var(--radius)", borderTop: "1px solid rgba(240,168,60,0.3)" }}>
              🏆 Qualifié : <b>{match.winner}</b>
            </div>
          )}

          {isAdmin && (
            <div className="live-admin-controls">
              <label>Statut
                <select className="edit" value={match.status} onChange={e => updateMatch({ status: e.target.value })}>
                  <option value="upcoming">À venir</option>
                  <option value="live">En direct</option>
                  <option value="done">Terminé</option>
                </select>
              </label>
              {isLive && (
                <label>Minute
                  <span className="minute-control">
                    <input className="edit minute" type="number" min="0" value={match.minute ?? 0} onChange={e => updateMatch({ minute: parseInt(e.target.value, 10) || 0 })} />
                    <button type="button" className="btn small ghost" onClick={() => updateMatch({ minute: (match.minute || 0) + 1 })}>+1'</button>
                  </span>
                </label>
              )}
              <label>Score
                <span className="minute-control">
                  <input className="edit score" type="number" value={match.scoreA ?? ""} placeholder="-" onChange={e => updateMatch({ scoreA: e.target.value === "" ? null : parseInt(e.target.value, 10) })} />
                  <span className="sep">–</span>
                  <input className="edit score" type="number" value={match.scoreB ?? ""} placeholder="-" onChange={e => updateMatch({ scoreB: e.target.value === "" ? null : parseInt(e.target.value, 10) })} />
                </span>
              </label>
              {isKnockout && (
                <label>Vainqueur
                  <select className="edit" value={match.winner || ""} onChange={e => updateMatch({ winner: e.target.value || null })}>
                    <option value="">Vainqueur ?</option>
                    <option value={match.teamA}>{match.teamA}</option>
                    <option value={match.teamB}>{match.teamB}</option>
                  </select>
                </label>
              )}
            </div>
          )}
        </div>

        <div className="section-head" style={{ marginTop: 32 }}>
          <h2>Fil du match</h2>
        </div>

        <div className="timeline">
          {events.length === 0 ? (
            <div className="empty">Aucun événement pour le moment.</div>
          ) : (
            events.map(ev => (
              <TimelineRow key={ev.id} ev={ev} match={match} isAdmin={isAdmin} onDelete={() => deleteEvent(ev.id)} />
            ))
          )}
        </div>

        {isAdmin && <EventForm match={match} onSubmit={addEvent} />}
      </div>

      <div className={`toast${toast.show ? " show" : ""}${toast.error ? " error" : ""}`}>{toast.msg}</div>
    </div>
  );
}

function TimelineRow({ ev, match, isAdmin, onDelete }) {
  const icon = { goal: "⚽", yellow: "🟨", red: "🟥", substitution: "🔁", info: "ℹ️" }[ev.type] || "⚽";
  let text = ev.scorer || "But";
  if (ev.type === "substitution") text = `${ev.scorer || "?"} remplace ${ev.playerOut || "?"}`;
  else if (ev.type === "info") text = ev.detail || "";
  else if (ev.type === "yellow") text = `${ev.scorer || "Joueur"}`;
  else if (ev.type === "red") text = `${ev.scorer || "Joueur"}`;

  if (!ev.team) {
    return (
      <div className="timeline-row timeline-row-info">
        <div className="timeline-info-badge">{icon} {text} <span className="timeline-minute-inline">{ev.minute}'</span></div>
        {isAdmin && <button className="ev-del" onClick={onDelete}>✕</button>}
      </div>
    );
  }

  const isA = ev.team === "A";
  return (
    <div className={`timeline-row ${isA ? "side-a" : "side-b"}`}>
      <div className="timeline-side timeline-side-a">{isA && <span className="timeline-event">{text} {icon}</span>}</div>
      <div className="timeline-minute">{ev.minute}'</div>
      <div className="timeline-side timeline-side-b">{!isA && <span className="timeline-event">{icon} {text}</span>}</div>
      {isAdmin && <button className="ev-del timeline-del" onClick={onDelete}>✕</button>}
    </div>
  );
}

function EventForm({ match, onSubmit }) {
  const [type, setType] = useState("goal");
  const [team, setTeam] = useState("A");
  const [minute, setMinute] = useState(match.minute || 1);
  const [scorer, setScorer] = useState("");
  const [playerOut, setPlayerOut] = useState("");
  const [detail, setDetail] = useState("");

  function submit(e) {
    e.preventDefault();
    const payload = { type, minute: parseInt(minute, 10) || 0 };
    if (type !== "info") payload.team = team;
    if (type === "substitution") {
      payload.scorer = scorer.trim() || null;
      payload.playerOut = playerOut.trim() || null;
    } else if (type === "info") {
      payload.detail = detail.trim() || null;
    } else {
      payload.scorer = scorer.trim() || null;
    }
    onSubmit(payload);
    setScorer("");
    setPlayerOut("");
    setDetail("");
  }

  return (
    <form className="event-form-card" onSubmit={submit}>
      <h3>Ajouter un événement</h3>
      <div className="event-form-row">
        <select className="edit" value={type} onChange={e => setType(e.target.value)}>
          {EVENT_TYPES.map(t => <option key={t.key} value={t.key}>{t.icon} {t.label}</option>)}
        </select>
        <input className="edit" type="number" min="0" style={{ width: 64 }} value={minute} onChange={e => setMinute(e.target.value)} placeholder="Min." />
        {type !== "info" && (
          <select className="edit" value={team} onChange={e => setTeam(e.target.value)}>
            <option value="A">{match.teamA}</option>
            <option value="B">{match.teamB}</option>
          </select>
        )}
      </div>
      <div className="event-form-row">
        {type === "substitution" ? (
          <>
            <input className="edit" style={{ flex: 1 }} placeholder="Joueur entrant" value={scorer} onChange={e => setScorer(e.target.value)} />
            <input className="edit" style={{ flex: 1 }} placeholder="Joueur sortant" value={playerOut} onChange={e => setPlayerOut(e.target.value)} />
          </>
        ) : type === "info" ? (
          <input className="edit" style={{ flex: 1 }} placeholder="Ex. Mi-temps, Fin du match, Coup d'envoi…" value={detail} onChange={e => setDetail(e.target.value)} />
        ) : (
          <input
            className="edit"
            style={{ flex: 1 }}
            placeholder={type === "goal" ? "Buteur (optionnel)" : "Joueur concerné (optionnel)"}
            value={scorer}
            onChange={e => setScorer(e.target.value)}
          />
        )}
        <button type="submit" className="btn primary small">Ajouter</button>
      </div>
    </form>
  );
}
