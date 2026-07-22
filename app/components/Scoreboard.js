"use client";

import { useEffect, useState } from "react";

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

export default function Scoreboard({ match, isLive, loading }) {
  const [countdown, setCountdown] = useState("");

  useEffect(() => {
    if (!match || match.status !== "upcoming") { setCountdown(""); return; }
    function tick() {
      const target = new Date(`${match.date}T${match.time}:00`);
      const diff = target - new Date();
      if (diff <= 0) { setCountdown(""); return; }
      const days = Math.floor(diff / 86400000);
      const hrs = Math.floor((diff % 86400000) / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      setCountdown(`Coup d'envoi dans ${days}j ${hrs}h ${mins}min`);
    }
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, [match]);

  if (loading) {
    return <div className="scoreboard"><div className="empty">Chargement du programme…</div></div>;
  }
  if (!match) {
    return <div className="scoreboard"><div className="empty">Aucun match programmé pour le moment.</div></div>;
  }

  const statusLabel = match.status === "live" ? "En direct" : match.status === "done" ? "Terminé" : "À venir";
  const statusClass = match.status === "live" ? "sb-status-live" : match.status === "done" ? "sb-status-done" : "";
  const hasScore = match.scoreA !== null && match.scoreA !== undefined && match.scoreB !== null && match.scoreB !== undefined;

  return (
    <div className="scoreboard">
      <div className="sb-label">
        <div className="lab">{isLive ? "Match en cours" : "Prochain match"}</div>
        <div className={`status ${statusClass}`}>
          {match.status === "live" && <span className="live-dot" />}
          {match.status === "live" ? `${match.minute ?? 0}' — ${statusLabel}` : statusLabel}
        </div>
      </div>
      <div className="sb-grid">
        <div className="sb-team">{match.teamA}</div>
        <div className="sb-score">
          <span>{hasScore ? match.scoreA : "–"}</span><span className="vs">VS</span><span>{hasScore ? match.scoreB : "–"}</span>
        </div>
        <div className="sb-team">{match.teamB}</div>
      </div>
      <div className="sb-meta">{formatDate(match.date)} · {match.time} · Groupe {match.group}</div>
      <div className="countdown">{countdown}</div>
    </div>
  );
}
