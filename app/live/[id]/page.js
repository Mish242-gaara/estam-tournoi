"use client";

import { useEffect, useState } from "react";
import SiteShell from "../../components/SiteShell";

const matchSeed = {
  id: 1,
  home: "Filière A",
  away: "Filière B",
  minute: 67,
  status: "En direct",
  competition: "Demi-finales",
  stadium: "Complexe sportif ESTAM",
  homeScore: 1,
  awayScore: 0
};

const initialEvents = [
  { id: 1, minute: 12, text: "But de la Filière A par Ndinga", team: "home" },
  { id: 2, minute: 54, text: "Carton jaune pour la Filière B", team: "away" }
];

export default function LivePage({ params }) {
  const id = Number(params?.id || 1);
  const [events, setEvents] = useState(initialEvents);
  const [match, setMatch] = useState({ ...matchSeed, id });

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(`estam-live-${id}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.events) setEvents(parsed.events);
        if (parsed.match) setMatch(parsed.match);
      }
    } catch {}
  }, [id]);

  useEffect(() => {
    window.localStorage.setItem(`estam-live-${id}`, JSON.stringify({ match, events }));
  }, [events, id, match]);

  function pushEvent() {
    const nextMinute = match.minute + 4;
    const newEvent = {
      id: Date.now(),
      minute: nextMinute,
      text: nextMinute % 2 === 0 ? "Nouvelle occasion très dangereuse" : "Passe décisive et pression offensive",
      team: nextMinute % 2 === 0 ? "away" : "home"
    };
    setEvents(prev => [...prev, newEvent]);
    setMatch(prev => ({ ...prev, minute: nextMinute }));
  }

  return (
    <SiteShell title="Match en direct" subtitle="Page dédiée au suivi temps réel du match, avec événements, score et contexte de la rencontre.">
      <div className="grid-2">
        <section className="card">
          <div className="card-head">
            <div>
              <div className="eyebrow">{match.competition}</div>
              <h2>{match.home} vs {match.away}</h2>
            </div>
            <div className="pill live">{match.status} · {match.minute}'</div>
          </div>

          <div className="scoreboard-card">
            <div>
              <strong>{match.home}</strong>
              <div className="big-score">{match.homeScore}</div>
            </div>
            <div className="vs">VS</div>
            <div>
              <strong>{match.away}</strong>
              <div className="big-score">{match.awayScore}</div>
            </div>
          </div>

          <div className="meta-grid">
            <div className="metric-card">
              <span>Stade</span>
              <strong>{match.stadium}</strong>
            </div>
            <div className="metric-card">
              <span>Temps</span>
              <strong>{match.minute}'</strong>
            </div>
            <div className="metric-card">
              <span>Audience</span>
              <strong>2.4k fans</strong>
            </div>
          </div>

          <button className="btn primary" onClick={pushEvent}>+ Ajouter un événement</button>
        </section>

        <section className="card">
          <div className="card-head">
            <h3>Flux temps réel</h3>
            <div className="pill">Live feed</div>
          </div>
          <div className="timeline">
            {events.map(event => (
              <div className="timeline-item" key={event.id}>
                <div className="timeline-time">{event.minute}'</div>
                <div>
                  <div className="timeline-text">{event.text}</div>
                  <div className="timeline-tag">{event.team === "home" ? match.home : match.away}</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </SiteShell>
  );
}
