"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import Scoreboard from "./components/Scoreboard";

const TABS = [
  { key: "accueil", label: "Accueil" },
  { key: "programme", label: "Programme" },
  { key: "classements", label: "Classements" },
  { key: "finales", label: "Finales" },
  { key: "buteurs", label: "Buteurs" }
];

const PHASE_LABELS = {
  finale_pn: "Finale Pointe-Noire",
  finale_generale: "Grande Finale",
  demi: "Demi-finale",
  quarts: "Quart de finale",
  huitiemes: "Huitième de finale",
  seiziemes: "Seizième de finale"
};
function phaseLabelFor(m) {
  if (!m.phase || m.phase === "groupes") return `Groupe ${m.group}`;
  return PHASE_LABELS[m.phase] || m.group || m.phase;
}

// 2 qualifiés par groupe (1er + 2e), classés par points puis différence de buts puis buts marqués.
function computeQualifiers(teams, group) {
  return teams
    .filter(t => t.group === group)
    .sort((a, b) => b.pts - a.pts || (b.bm - b.be) - (a.bm - a.be) || b.bm - a.bm)
    .slice(0, 2);
}

// Détermine automatiquement la suite des tours à élimination directe en fonction
// du nombre total de qualifiés (2 par groupe), jusqu'à la finale de Pointe-Noire.
function roundsForQualifierCount(n) {
  const rounds = [];
  let c = n;
  while (c > 2) {
    let key, label;
    if (c >= 32) { key = "seiziemes"; label = "Seizièmes de finale"; }
    else if (c === 16) { key = "huitiemes"; label = "Huitièmes de finale"; }
    else if (c === 8) { key = "quarts"; label = "Quarts de finale"; }
    else if (c === 4) { key = "demi"; label = "Demi-finales"; }
    else { key = `tour${c}`; label = `Tour à ${c} équipes`; }
    rounds.push({ key, label, matchCount: Math.floor(c / 2) });
    c = Math.floor(c / 2);
  }
  rounds.push({ key: "finale_pn", label: "Finale Pointe-Noire", matchCount: 1 });
  return rounds;
}

// Tirage croisé du premier tour : le 1er d'un groupe affronte le 2e d'un autre groupe,
// pour éviter que deux équipes du même groupe ne se rencontrent tout de suite.
function crossSeedFirstRound(qualifiersByGroup) {
  const pairs = [];
  for (let i = 0; i < qualifiersByGroup.length; i += 2) {
    const gA = qualifiersByGroup[i];
    const gB = qualifiersByGroup[i + 1];
    if (!gB) {
      if (gA.teams[0] && gA.teams[1]) pairs.push([gA.teams[0].name, gA.teams[1].name]);
      continue;
    }
    if (gA.teams[0] && gB.teams[1]) pairs.push([gA.teams[0].name, gB.teams[1].name]);
    if (gB.teams[0] && gA.teams[1]) pairs.push([gB.teams[0].name, gA.teams[1].name]);
  }
  return pairs;
}

const EVENT_ICONS = { goal: "⚽", yellow: "🟨", red: "🟥", substitution: "🔁", info: "ℹ️" };
function eventIcon(ev) {
  return EVENT_ICONS[ev.type] || "⚽";
}
function eventText(ev) {
  if (ev.type === "substitution") return `${ev.scorer || "?"} remplace ${ev.playerOut || "?"}`;
  if (ev.type === "info") return ev.detail || "";
  if (ev.type === "yellow") return `${ev.scorer || "Joueur"} (carton jaune)`;
  if (ev.type === "red") return `${ev.scorer || "Joueur"} (carton rouge)`;
  return ev.scorer || "But";
}

function formatDate(iso) {
  if (!iso) return "";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
}

export default function Page() {
  const [tab, setTab] = useState("accueil");
  const [navOpen, setNavOpen] = useState(false);

  const [matches, setMatches] = useState([]);
  const [teams, setTeams] = useState([]);
  const [scorers, setScorers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authModal, setAuthModal] = useState(null); // null | 'login' | 'register'
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const isAdmin = user?.role === "admin";

  const [toast, setToast] = useState({ show: false, msg: "", error: false });
  const toastTimer = useRef(null);

  const showToast = useCallback((msg, error = false) => {
    setToast({ show: true, msg, error });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 2400);
  }, []);

  // ---------- data loading ----------
  const loadAll = useCallback(async () => {
    try {
      const [m, t, s] = await Promise.all([
        fetch("/api/matches").then(r => r.json()),
        fetch("/api/teams").then(r => r.json()),
        fetch("/api/scorers").then(r => r.json())
      ]);
      setMatches(m);
      setTeams(t);
      setScorers(s);
    } catch (e) {
      showToast("Impossible de charger les données. Vérifiez la base de données.", true);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadAll();
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => setUser(d.user))
      .catch(() => {})
      .finally(() => setAuthLoading(false));
  }, [loadAll]);

  // Rafraîchissement automatique en arrière-plan (façon Flashscore) — toutes les 12s,
  // sans afficher de chargement, pour que tous les visiteurs voient les scores en direct.
  useEffect(() => {
    const id = setInterval(async () => {
      try {
        const [m, t, s] = await Promise.all([
          fetch("/api/matches").then(r => r.json()),
          fetch("/api/teams").then(r => r.json()),
          fetch("/api/scorers").then(r => r.json())
        ]);
        setMatches(m);
        setTeams(t);
        setScorers(s);
      } catch (e) {
        // échec silencieux — on retentera au prochain cycle
      }
    }, 12000);
    return () => clearInterval(id);
  }, []);

  // ---------- auth ----------
  const [authForm, setAuthForm] = useState({ name: "", email: "", password: "", role: "fan", teamId: "" });
  const [authErr, setAuthErr] = useState("");
  const [authInfo, setAuthInfo] = useState("");
  const [authBusy, setAuthBusy] = useState(false);

  function openAuth(mode) {
    setAuthForm({ name: "", email: "", password: "", role: "fan", teamId: "" });
    setAuthErr("");
    setAuthInfo("");
    setAuthModal(mode);
  }

  async function submitLogin() {
    setAuthErr("");
    setAuthBusy(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: authForm.email, password: authForm.password })
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthErr(data.error || "Connexion impossible.");
      } else {
        setUser(data.user);
        setAuthModal(null);
        showToast(`Bienvenue, ${data.user.name}`);
      }
    } catch (e) {
      setAuthErr("Erreur de connexion au serveur.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function submitRegister() {
    setAuthErr("");
    setAuthInfo("");
    setAuthBusy(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(authForm)
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthErr(data.error || "Inscription impossible.");
      } else if (authForm.role === "coach") {
        setAuthInfo("Compte créé. Il doit être validé par un administrateur avant de pouvoir vous connecter.");
      } else {
        setAuthInfo("Compte créé ! Vous pouvez maintenant vous connecter.");
      }
    } catch (e) {
      setAuthErr("Erreur de connexion au serveur.");
    } finally {
      setAuthBusy(false);
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (e) {}
    setUser(null);
    setUserMenuOpen(false);
    showToast("Déconnecté");
  }

  // ---------- generic mutate helper (session cookie sent automatically) ----------
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
      showToast("Une erreur est survenue lors de l'enregistrement.", true);
      throw new Error("mutation failed");
    }
    return res.status === 204 ? null : res.json();
  }

  // ---------- matches CRUD ----------
  async function addMatch() {
    try {
      const created = await apiMutate("/api/matches", "POST", {
        date: new Date().toISOString().slice(0, 10),
        time: "12:00",
        teamA: "Équipe A",
        teamB: "Équipe B",
        scoreA: null,
        scoreB: null,
        group: "A",
        status: "upcoming"
      });
      setMatches(m => [...m, created]);
      showToast("Match ajouté — modifiez les détails");
    } catch (e) {}
  }
  async function updateMatch(id, patch) {
    const current = matches.find(m => m.id === id);
    if (!current) return;
    const updated = { ...current, ...patch };
    setMatches(m => m.map(x => (x.id === id ? updated : x))); // optimistic
    try {
      await apiMutate(`/api/matches/${id}`, "PUT", updated);
    } catch (e) {
      loadAll();
    }
  }
  async function deleteMatch(id) {
    if (!confirm("Supprimer ce match ?")) return;
    try {
      await apiMutate(`/api/matches/${id}`, "DELETE");
      setMatches(m => m.filter(x => x.id !== id));
    } catch (e) {}
  }
  async function createRound(roundKey, roundLabel, pairings) {
    try {
      const created = await Promise.all(
        pairings.map((pair, idx) =>
          apiMutate("/api/matches", "POST", {
            date: new Date().toISOString().slice(0, 10),
            time: "15:00",
            teamA: pair[0],
            teamB: pair[1],
            scoreA: null,
            scoreB: null,
            group: roundLabel,
            status: "upcoming",
            minute: null,
            phase: roundKey,
            winner: null,
            slot: idx + 1
          })
        )
      );
      setMatches(m => [...m, ...created]);
      showToast(`${roundLabel} créées — modifiez les dates si besoin`);
    } catch (e) {}
  }

  // ---------- live match events ----------
  async function addEvent(matchId, payload) {
    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, ...payload })
      });
      if (res.status === 401) {
        setUser(null);
        showToast("Session expirée, reconnectez-vous.", true);
        return;
      }
      if (!res.ok) { showToast("Erreur lors de l'ajout de l'événement.", true); return; }
      const { event, match } = await res.json();
      setMatches(list => list.map(m => (m.id === matchId ? { ...match, events: [...(m.events || []), event].sort((a, b) => a.minute - b.minute) } : m)));
      showToast("Événement ajouté");
    } catch (e) {
      showToast("Erreur lors de l'ajout de l'événement.", true);
    }
  }
  async function deleteEvent(eventId, matchId) {
    try {
      const res = await fetch(`/api/events/${eventId}`, { method: "DELETE" });
      if (res.status === 401) {
        setUser(null);
        showToast("Session expirée, reconnectez-vous.", true);
        return;
      }
      if (!res.ok) { showToast("Erreur lors de la suppression.", true); return; }
      const { match } = await res.json();
      setMatches(list => list.map(m => (m.id === matchId ? { ...(match || m), events: (m.events || []).filter(e => e.id !== eventId) } : m)));
    } catch (e) {
      showToast("Erreur lors de la suppression.", true);
    }
  }

  // ---------- teams CRUD ----------
  async function addTeam(group) {
    try {
      const created = await apiMutate("/api/teams", "POST", {
        name: `Filière ${teams.filter(t => t.group === group).length + 1}`,
        group,
        j: 0, bm: 0, be: 0, pts: 0
      });
      setTeams(t => [...t, created]);
    } catch (e) {}
  }
  async function updateTeam(id, patch) {
    const current = teams.find(t => t.id === id);
    if (!current) return;
    const updated = { ...current, ...patch };
    setTeams(t => t.map(x => (x.id === id ? updated : x)));
    try {
      await apiMutate(`/api/teams/${id}`, "PUT", updated);
    } catch (e) {
      loadAll();
    }
  }
  async function deleteTeam(id) {
    if (!confirm("Retirer cette filière du classement ?")) return;
    try {
      await apiMutate(`/api/teams/${id}`, "DELETE");
      setTeams(t => t.filter(x => x.id !== id));
    } catch (e) {}
  }

  // ---------- scorers CRUD ----------
  async function addScorer() {
    try {
      const created = await apiMutate("/api/scorers", "POST", { player: "Nouveau joueur", fil: "—", buts: 0 });
      setScorers(s => [...s, created]);
      showToast("Buteur ajouté — modifiez les détails");
    } catch (e) {}
  }
  async function updateScorer(id, patch) {
    const current = scorers.find(s => s.id === id);
    if (!current) return;
    const updated = { ...current, ...patch };
    setScorers(s => s.map(x => (x.id === id ? updated : x)));
    try {
      await apiMutate(`/api/scorers/${id}`, "PUT", updated);
    } catch (e) {
      loadAll();
    }
  }
  async function deleteScorer(id) {
    if (!confirm("Retirer ce joueur du classement des buteurs ?")) return;
    try {
      await apiMutate(`/api/scorers/${id}`, "DELETE");
      setScorers(s => s.filter(x => x.id !== id));
    } catch (e) {}
  }

  // ---------- derived data ----------
  const sortedMatches = [...matches].sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  const live = sortedMatches.find(m => m.status === "live");
  const nextMatch = live || sortedMatches.find(m => m.status === "upcoming") || sortedMatches[sortedMatches.length - 1];
  const groupA = teams.filter(t => t.group === "A").sort((a, b) => b.pts - a.pts);
  const groupB = teams.filter(t => t.group === "B").sort((a, b) => b.pts - a.pts);

  // Phases finales : 2 qualifiés par groupe. Le nombre de groupes détermine automatiquement
  // le premier tour (2 groupes → demi-finales, 4 groupes → quarts, etc.), jusqu'à la finale
  // de Pointe-Noire, puis la grande finale contre Brazzaville.
  const groupsList = Array.from(new Set(teams.map(t => t.group))).filter(Boolean).sort();
  const qualifiersByGroup = groupsList.map(g => ({ group: g, teams: computeQualifiers(teams, g) }));
  const totalQualifiers = groupsList.length * 2;
  const roundPlan = totalQualifiers >= 2 ? roundsForQualifierCount(totalQualifiers) : [];
  const finaleGen = matches.find(m => m.phase === "finale_generale");

  const groupStageMatches = sortedMatches.filter(m => !m.phase || m.phase === "groupes");
  const sortedScorers = [...scorers].sort((a, b) => b.buts - a.buts);
  const matchesByDate = groupStageMatches.reduce((acc, m) => {
    (acc[m.date] = acc[m.date] || []).push(m);
    return acc;
  }, {});
  const playedCount = matches.filter(m => m.status === "done").length;
  const totalGoals = matches.reduce((s, m) => s + (m.scoreA || 0) + (m.scoreB || 0), 0);
  const topScorer = sortedScorers[0];
  const upcomingPreview = matches
    .filter(m => m.status !== "done")
    .sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))
    .slice(0, 3);

  return (
    <>
      <header className="site">
        <div className="header-inner">
          <div className="brand">
            <div className="brand-badge">ES</div>
            <div className="brand-text">
              <div className="t1">ESTAM · POINTE-NOIRE</div>
              <div className="t2">Tournoi Inter-Filières</div>
            </div>
          </div>
          <nav className={`tabs${navOpen ? " open" : ""}`}>
            {TABS.map(t => (
              <button key={t.key} className={tab === t.key ? "active" : ""} onClick={() => { setTab(t.key); setNavOpen(false); }}>
                {t.label}
              </button>
            ))}
            {isAdmin && (
              <button className={tab === "admin" ? "active" : ""} onClick={() => { setTab("admin"); setNavOpen(false); }}>
                Comptes
              </button>
            )}
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: 10, position: "relative" }}>
            {!authLoading && (
              user ? (
                <div style={{ position: "relative" }}>
                  <button id="adminBtn" className={isAdmin ? "on" : ""} onClick={() => setUserMenuOpen(o => !o)}>
                    {user.name}{isAdmin ? " ★" : user.role === "coach" ? " (coach)" : ""}
                  </button>
                  {userMenuOpen && (
                    <div className="user-dropdown">
                      <div className="user-dropdown-email">{user.email}</div>
                      <button onClick={logout}>Se déconnecter</button>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <button id="adminBtn" onClick={() => openAuth("login")}>Se connecter</button>
                  <button className="btn small ghost" onClick={() => openAuth("register")}>Créer un compte</button>
                </>
              )
            )}
            <button className="mobile-toggle" onClick={() => setNavOpen(o => !o)}>☰</button>
          </div>
        </div>
      </header>

      {tab === "accueil" && (
        <div className="hero">
          <div className="stripes tl" />
          <div className="stripes red br" />
          <div className="wrap">
            <div className="eyebrow">Phase de groupes · Pointe-Noire</div>
            <h1>Tournoi <span>Inter-Filières</span><br />ESTAM 2026</h1>
            <p className="lead">Programme des matchs, classements et meilleurs buteurs de la phase Pointe-Noire, mis à jour en direct par les organisateurs.</p>

            

            <Scoreboard match={nextMatch} isLive={Boolean(live)} loading={loading} />
          </div>
        </div>
      )}

      <div className="wrap">
        {tab === "accueil" && (
          <section className="tab active">
            {matches.some(m => m.status === "live") && (
              <>
                <div className="section-head">
                  <h2><span className="live-dot" /> En direct</h2>
                </div>
                {matches.filter(m => m.status === "live").map(m => (
                  <MatchCard key={m.id} m={m} isAdmin={isAdmin} onUpdate={updateMatch} onDelete={deleteMatch} onAddEvent={addEvent} onDeleteEvent={deleteEvent} />
                ))}
              </>
            )}

            <div className="section-head" style={{ marginTop: matches.some(m => m.status === "live") ? 34 : 0 }}>
              <h2>Aperçu du tournoi</h2>
              <div className="sub">{loading ? "Chargement…" : "Données partagées entre organisateurs"}</div>
            </div>
            <div className="overview-grid">
              <div className="ov-card">
                <h3>Matchs joués</h3>
                <div className="big">{playedCount} / {matches.length}</div>
                <p>Phase de groupes — Pointe-Noire</p>
              </div>
              <div className="ov-card">
                <h3>Buts marqués</h3>
                <div className="big">{totalGoals}</div>
                <p>Sur les rencontres jouées</p>
              </div>
              <div className="ov-card">
                <h3>Meilleur buteur</h3>
                <div className="big">{topScorer ? topScorer.buts : "—"}</div>
                <p>{topScorer ? `${topScorer.player} · ${topScorer.fil}` : "Aucune donnée"}</p>
              </div>
            </div>

            <div className="section-head" style={{ marginTop: 38 }}>
              <h2>Prochains matchs</h2>
            </div>
            {upcomingPreview.length === 0 ? (
              <div className="empty">Aucun match à venir.</div>
            ) : (
              upcomingPreview.map(m => (
                <div className="match-card" key={m.id}>
                  <div className="match-time">{m.time}</div>
                  <div className="match-teams">
                    <span className="nm">{m.teamA}</span><span className="sep">VS</span><span className="nm">{m.teamB}</span>
                  </div>
                  <div className="match-tags">
                    <span className="tag">{formatDate(m.date)}</span>
                    <span className="tag">Groupe {m.group}</span>
                  </div>
                </div>
              ))
            )}
          </section>
        )}

        {tab === "programme" && (
          <section className="tab active">
            <div className="section-head">
              <h2>Programme des matchs</h2>
              {isAdmin && <button className="btn primary small" onClick={addMatch}>+ Ajouter un match</button>}
            </div>
            {Object.keys(matchesByDate).length === 0 ? (
              <div className="empty">Aucun match programmé. Ajoutez le premier match.</div>
            ) : (
              Object.keys(matchesByDate).sort().map(date => (
                <div className="day-group" key={date}>
                  <div className="day-title">{formatDate(date)}</div>
                  {matchesByDate[date]
                    .sort((a, b) => a.time.localeCompare(b.time))
                    .map(m => (
                      <MatchCard key={m.id} m={m} isAdmin={isAdmin} onUpdate={updateMatch} onDelete={deleteMatch} onAddEvent={addEvent} onDeleteEvent={deleteEvent} />
                    ))}
                </div>
              ))
            )}
          </section>
        )}

        {tab === "classements" && (
          <section className="tab active">
            <div className="section-head">
              <h2>Classements — Phase de groupes</h2>
              <div className="sub">J = joués · BM = buts marqués · BE = buts encaissés · DB = différence de buts</div>
            </div>
            <div className="groups-grid">
              <GroupTable title="Groupe A" teams={groupA} isAdmin={isAdmin} onUpdate={updateTeam} onDelete={deleteTeam} onAdd={() => addTeam("A")} />
              <GroupTable title="Groupe B" teams={groupB} isAdmin={isAdmin} onUpdate={updateTeam} onDelete={deleteTeam} onAdd={() => addTeam("B")} />
            </div>
          </section>
        )}

        {tab === "finales" && (
          <section className="tab active">
            <div className="section-head">
              <h2>Phases finales</h2>
              <div className="sub">Les 2 premiers de chaque groupe se qualifient</div>
            </div>
            <p className="bracket-intro">
              {groupsList.length} groupe{groupsList.length > 1 ? "s" : ""} → <b>{totalQualifiers} équipes qualifiées</b>.
              Le tournoi enchaîne automatiquement les tours à élimination directe jusqu'à la <b>finale de Pointe-Noire</b>,
              dont le vainqueur affronte le champion de Brazzaville pour le titre national.
            </p>

            <div className="qualifiers-grid">
              {qualifiersByGroup.map(g => (
                <div className="bracket-slot" key={g.group}>
                  <h4>Groupe {g.group}</h4>
                  {g.teams.length === 0 ? (
                    <div className="empty small">Aucune donnée</div>
                  ) : (
                    <ul className="qual-list">
                      {g.teams.map((t, i) => (
                        <li key={t.id}>
                          <span className="q-rank">{i === 0 ? "1er" : "2e"}</span> {t.name} <span className="q-tag">{t.pts} pts</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            <div className="bracket-flow">
              {roundPlan.map((round, idx) => {
                const roundMatches = matches.filter(m => m.phase === round.key).sort((a, b) => (a.slot || 0) - (b.slot || 0));
                let pairings = [];
                let canCreate = false;

                if (roundMatches.length === 0) {
                  if (idx === 0) {
                    pairings = crossSeedFirstRound(qualifiersByGroup);
                    canCreate = pairings.length === round.matchCount && pairings.every(p => p[0] && p[1]);
                  } else {
                    const prevRound = roundPlan[idx - 1];
                    const prevMatches = matches.filter(m => m.phase === prevRound.key).sort((a, b) => (a.slot || 0) - (b.slot || 0));
                    if (prevMatches.length === prevRound.matchCount) {
                      for (let i = 0; i < prevMatches.length; i += 2) {
                        const a = prevMatches[i];
                        const b = prevMatches[i + 1];
                        pairings.push([a?.winner || `Vainqueur (${a?.teamA} / ${a?.teamB})`, b?.winner || `Vainqueur (${b?.teamA} / ${b?.teamB})`]);
                      }
                      canCreate = true;
                    }
                  }
                }

                return (
                  <div className="round-block" key={round.key}>
                    <div className="round-head">
                      <h3>{round.label}</h3>
                      <span className="round-count">{round.matchCount} match{round.matchCount > 1 ? "s" : ""}</span>
                    </div>
                    {roundMatches.length > 0 ? (
                      <div className="round-matches">
                        {roundMatches.map(m => (
                          <MatchCard key={m.id} m={m} isAdmin={isAdmin} onUpdate={updateMatch} onDelete={deleteMatch} onAddEvent={addEvent} onDeleteEvent={deleteEvent} />
                        ))}
                      </div>
                    ) : canCreate && isAdmin ? (
                      <button className="btn primary small" onClick={() => createRound(round.key, round.label, pairings)}>
                        + Créer {round.label.toLowerCase()}
                      </button>
                    ) : (
                      <div className="empty small">{canCreate ? "Pas encore créé" : "En attente du tour précédent"}</div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="section-head" style={{ marginTop: 34 }}>
              <h2>Grande Finale · vs Brazzaville</h2>
            </div>
            {(() => {
              const finalePN = matches.find(m => m.phase === "finale_pn");
              if (finaleGen) {
                return <MatchCard m={finaleGen} isAdmin={isAdmin} onUpdate={updateMatch} onDelete={deleteMatch} onAddEvent={addEvent} onDeleteEvent={deleteEvent} />;
              }
              if (isAdmin) {
                return (
                  <button
                    className="btn primary small"
                    disabled={!finalePN}
                    onClick={() => createRound("finale_generale", "Grande Finale", [[finalePN?.winner || "Vainqueur Pointe-Noire", "Vainqueur Brazzaville"]])}
                  >
                    + Créer la grande finale
                  </button>
                );
              }
              return <div className="empty small">Grande finale pas encore programmée</div>;
            })()}
          </section>
        )}

        {tab === "buteurs" && (
          <section className="tab active">
            <div className="section-head">
              <h2>Meilleurs buteurs</h2>
              {isAdmin && <button className="btn primary small" onClick={addScorer}>+ Ajouter un buteur</button>}
            </div>
            <div className="scorers-card">
              <table className="top">
                <thead>
                  <tr>
                    <th>Rang</th><th>Joueur</th><th>Filière</th><th>Buts</th>{isAdmin && <th></th>}
                  </tr>
                </thead>
                <tbody>
                  {sortedScorers.length === 0 ? (
                    <tr><td colSpan={5} className="empty">Aucun buteur enregistré</td></tr>
                  ) : (
                    sortedScorers.map((s, idx) => (
                      <ScorerRow key={s.id} s={s} rank={idx + 1} isAdmin={isAdmin} onUpdate={updateScorer} onDelete={deleteScorer} />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab === "admin" && isAdmin && <AdminCoachesPanel showToast={showToast} />}
      </div>

      <footer>
        <div className="wrap foot-grid">
          <div className="foot-col">
            <h4>Brazzaville</h4>
            <p>Site 1 : 233 rue de la Libération OCH (Réf. entre la poissonnerie du Rail et le commissariat de l'OCH)</p>
            <p>Site 2 : 22 rue Likoala, Immeuble Dabo en face de la BCH, Poto-Poto</p>
          </div>
          <div className="foot-col">
            <h4>Pointe-Noire</h4>
            <p>Site 1 : SOCOPRIDE, N° 82 Avenue Nelson Mandela entre rond point Flama et la station Puma (OCI)</p>
            <p>Site 2 : OCH bord board, Immeuble se trouvant entre les arrêtes deux palmiers et pharmaceutique la grande</p>
          </div>
          <div className="foot-col">
            <h4>Info-line</h4>
            <p>(+242) 06 822 91 78 / 05 557 58 32</p>
            <p>(+242) 06 497 03 01 / 05 670 24 71</p>
          </div>
        </div>
        <div className="foot-bottom">ESTAM — École Supérieure des Technologies Avancées et de Management · Site mis à jour par les organisateurs du tournoi</div>
      </footer>

      <div className={`toast${toast.show ? " show" : ""}${toast.error ? " error" : ""}`}>{toast.msg}</div>

      <div className={`modal-bg${authModal ? " open" : ""}`}>
        <div className="modal">
          {authModal === "login" ? (
            <>
              <h3>Se connecter</h3>
              <p>Connectez-vous à votre compte administrateur, coach ou supporter.</p>
              <input type="email" placeholder="Email" value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} onKeyDown={e => { if (e.key === "Enter") submitLogin(); }} autoFocus />
              <input type="password" placeholder="Mot de passe" value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} onKeyDown={e => { if (e.key === "Enter") submitLogin(); }} />
              <div className="modal-err">{authErr}</div>
              <div className="modal-actions">
                <button className="btn ghost" onClick={() => setAuthModal(null)}>Annuler</button>
                <button className="btn primary" onClick={submitLogin} disabled={authBusy}>{authBusy ? "…" : "Se connecter"}</button>
              </div>
              <p className="auth-switch">Pas de compte ? <button type="button" onClick={() => openAuth("register")}>En créer un</button></p>
            </>
          ) : (
            <>
              <h3>Créer un compte</h3>
              <p>Compte <b>supporter</b> : activé immédiatement. Compte <b>coach</b> : à valider par un administrateur avant de pouvoir vous connecter.</p>
              <div className="role-toggle">
                <button type="button" className={authForm.role === "fan" ? "active" : ""} onClick={() => setAuthForm({ ...authForm, role: "fan" })}>Supporter</button>
                <button type="button" className={authForm.role === "coach" ? "active" : ""} onClick={() => setAuthForm({ ...authForm, role: "coach" })}>Coach</button>
              </div>
              <input type="text" placeholder="Nom" value={authForm.name} onChange={e => setAuthForm({ ...authForm, name: e.target.value })} />
              <input type="email" placeholder="Email" value={authForm.email} onChange={e => setAuthForm({ ...authForm, email: e.target.value })} />
              <input type="password" placeholder="Mot de passe (6 caractères min.)" value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })} />
              {authForm.role === "coach" && (
                <select className="edit" style={{ width: "100%", marginBottom: 6 }} value={authForm.teamId} onChange={e => setAuthForm({ ...authForm, teamId: e.target.value })}>
                  <option value="">Filière encadrée…</option>
                  {teams.map(t => <option key={t.id} value={t.id}>{t.name} (Groupe {t.group})</option>)}
                </select>
              )}
              <div className="modal-err">{authErr}</div>
              {authInfo && <div className="auth-info">{authInfo}</div>}
              <div className="modal-actions">
                <button className="btn ghost" onClick={() => setAuthModal(null)}>Fermer</button>
                <button className="btn primary" onClick={submitRegister} disabled={authBusy}>{authBusy ? "…" : "Créer le compte"}</button>
              </div>
              <p className="auth-switch">Déjà un compte ? <button type="button" onClick={() => openAuth("login")}>Se connecter</button></p>
            </>
          )}
        </div>
      </div>
    </>
  );
}

// ============================================================
// Admin panel — coach account approval
// ============================================================
function AdminCoachesPanel({ showToast }) {
  const [coaches, setCoaches] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/coaches");
      const data = await res.json();
      setCoaches(Array.isArray(data) ? data : []);
    } catch (e) {
      showToast("Impossible de charger les comptes coachs.", true);
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { load(); }, [load]);

  async function setStatus(id, status) {
    try {
      const res = await fetch(`/api/admin/coaches/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (!res.ok) { showToast("Erreur lors de la mise à jour.", true); return; }
      const updated = await res.json();
      setCoaches(list => list.map(c => (c.id === id ? { ...c, status: updated.status } : c)));
      showToast(status === "approved" ? "Coach validé" : "Coach refusé");
    } catch (e) {
      showToast("Erreur lors de la mise à jour.", true);
    }
  }

  const pending = coaches.filter(c => c.status === "pending");
  const others = coaches.filter(c => c.status !== "pending");

  return (
    <section className="tab active">
      <div className="section-head">
        <h2>Comptes coachs</h2>
        <div className="sub">{loading ? "Chargement…" : `${pending.length} en attente de validation`}</div>
      </div>

      {pending.length > 0 && (
        <div className="coach-list">
          {pending.map(c => (
            <div className="coach-row" key={c.id}>
              <div className="coach-info">
                <b>{c.name}</b>
                <span>{c.email}</span>
                <span className="tag">{c.teamName || "Filière non précisée"}</span>
              </div>
              <div className="coach-actions">
                <button className="btn primary small" onClick={() => setStatus(c.id, "approved")}>Valider</button>
                <button className="btn danger small" onClick={() => setStatus(c.id, "rejected")}>Refuser</button>
              </div>
            </div>
          ))}
        </div>
      )}
      {pending.length === 0 && !loading && <div className="empty">Aucune demande en attente.</div>}

      {others.length > 0 && (
        <>
          <div className="section-head" style={{ marginTop: 30 }}>
            <h2 style={{ fontSize: 18 }}>Autres comptes coachs</h2>
          </div>
          <div className="coach-list">
            {others.map(c => (
              <div className="coach-row" key={c.id}>
                <div className="coach-info">
                  <b>{c.name}</b>
                  <span>{c.email}</span>
                  <span className="tag">{c.teamName || "Filière non précisée"}</span>
                </div>
                <span className={`tag ${c.status === "approved" ? "status-upcoming" : "status-live"}`}>
                  {c.status === "approved" ? "Validé" : "Refusé"}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

// ============================================================
// Match card (view + admin edit + live buts)
// ============================================================
function MatchCard({ m, isAdmin, onUpdate, onDelete, onAddEvent, onDeleteEvent }) {
  const [expanded, setExpanded] = useState(m.status === "live");
  const [newScorer, setNewScorer] = useState("");
  const [newTeam, setNewTeam] = useState("A");
  const [newMinute, setNewMinute] = useState(m.minute || 1);
  const events = (m.events || []).slice().sort((a, b) => a.minute - b.minute);
  const isLive = m.status === "live";

  function submitGoal(e) {
    e.preventDefault();
    onAddEvent(m.id, { minute: parseInt(newMinute, 10) || 0, team: newTeam, scorer: newScorer.trim() || null });
    setNewScorer("");
  }

  const hasScore = m.scoreA !== null && m.scoreA !== undefined && m.scoreB !== null && m.scoreB !== undefined;
  const statusClass = m.status === "done" ? "status-done" : m.status === "live" ? "status-live" : "status-upcoming";
  const statusLabel = m.status === "done" ? "Terminé" : m.status === "live" ? "En direct" : "À venir";
  const isKnockout = m.phase && m.phase !== "groupes";
  const phaseLabel = phaseLabelFor(m);

  return (
    <div className={`match-card-wrap${isLive ? " is-live" : ""}`}>
      {isAdmin ? (
        <div className="match-card">
          <input className="edit date" type="date" defaultValue={m.date} onChange={e => onUpdate(m.id, { date: e.target.value })} />
          <input className="edit time" type="time" defaultValue={m.time} onChange={e => onUpdate(m.id, { time: e.target.value })} />
          <div className="match-teams">
            <input className="edit team" defaultValue={m.teamA} onChange={e => onUpdate(m.id, { teamA: e.target.value })} />
            <input className="edit score" type="number" value={m.scoreA ?? ""} placeholder="-" onChange={e => onUpdate(m.id, { scoreA: e.target.value === "" ? null : parseInt(e.target.value, 10) })} />
            <span className="sep">VS</span>
            <input className="edit score" type="number" value={m.scoreB ?? ""} placeholder="-" onChange={e => onUpdate(m.id, { scoreB: e.target.value === "" ? null : parseInt(e.target.value, 10) })} />
            <input className="edit team" defaultValue={m.teamB} onChange={e => onUpdate(m.id, { teamB: e.target.value })} />
          </div>
          {!isKnockout && (
            <select className="edit" defaultValue={m.group} onChange={e => onUpdate(m.id, { group: e.target.value })}>
              <option value="A">Groupe A</option>
              <option value="B">Groupe B</option>
            </select>
          )}
          <select className="edit" defaultValue={m.status} onChange={e => onUpdate(m.id, { status: e.target.value })}>
            <option value="upcoming">À venir</option>
            <option value="live">En direct</option>
            <option value="done">Terminé</option>
          </select>
          {isKnockout && (
            <select className="edit" defaultValue={m.winner || ""} onChange={e => onUpdate(m.id, { winner: e.target.value || null })}>
              <option value="">Vainqueur ?</option>
              <option value={m.teamA}>{m.teamA}</option>
              <option value={m.teamB}>{m.teamB}</option>
            </select>
          )}
          {isLive && (
            <div className="minute-control">
              <input className="edit minute" type="number" min="0" value={m.minute ?? 0} onChange={e => onUpdate(m.id, { minute: parseInt(e.target.value, 10) || 0 })} />
              <span className="min-suffix">'</span>
              <button type="button" className="btn small ghost" onClick={() => onUpdate(m.id, { minute: (m.minute || 0) + 1 })}>+1'</button>
            </div>
          )}
          <div className="match-admin">
            <Link href={`/match/${m.id}`} className="btn small ghost">Page match →</Link>
            <button className="btn small ghost" onClick={() => setExpanded(x => !x)}>{expanded ? "Réduire" : "Buts"}</button>
            <button className="btn danger small" onClick={() => onDelete(m.id)}>Supprimer</button>
          </div>
        </div>
      ) : (
        <div className="match-card" onClick={() => events.length > 0 && setExpanded(x => !x)} style={{ cursor: events.length > 0 ? "pointer" : "default" }}>
          <div className="match-time">
            {isLive ? (
              <span className="live-minute"><span className="live-dot" />{m.minute ?? 0}'</span>
            ) : (
              m.time
            )}
          </div>
          <div className="match-teams">
            <span className="nm">{m.teamA}</span>
            {hasScore ? (
              <>
                <span className="sc">{m.scoreA}</span><span className="sep">–</span><span className="sc">{m.scoreB}</span>
              </>
            ) : (
              <span className="sep">VS</span>
            )}
            <span className="nm">{m.teamB}</span>
          </div>
          <div className="match-tags">
            <span className="tag">{phaseLabel}</span>
            <span className={`tag ${statusClass}`}>{statusLabel}</span>
            <Link href={`/match/${m.id}`} className="match-link" onClick={e => e.stopPropagation()}>
              {isLive ? "🔴 Direct" : "Détails →"}
            </Link>
          </div>
        </div>
      )}

      {isKnockout && m.winner && (
        <div className="winner-note">🏆 Qualifié : <b>{m.winner}</b></div>
      )}

      {expanded && (
        <div className="events-panel">
          {events.length === 0 ? (
            <div className="events-empty">Aucun événement pour le moment.</div>
          ) : (
            <ul className="events-list">
              {events.map(ev => (
                <li key={ev.id} className={`event-item${ev.team ? ` team-${ev.team}` : " team-info"}`}>
                  <span className="ev-minute">{ev.minute}'</span>
                  <span className="ev-ball">{eventIcon(ev)}</span>
                  <span className="ev-scorer">{eventText(ev)} {ev.team && <span className="ev-team">({ev.team === "A" ? m.teamA : m.teamB})</span>}</span>
                  {isAdmin && <button className="ev-del" onClick={() => onDeleteEvent(ev.id, m.id)}>✕</button>}
                </li>
              ))}
            </ul>
          )}
          {isAdmin && (
            <form className="goal-form" onSubmit={submitGoal}>
              <select value={newTeam} onChange={e => setNewTeam(e.target.value)} className="edit">
                <option value="A">{m.teamA}</option>
                <option value="B">{m.teamB}</option>
              </select>
              <input className="edit" type="number" min="0" placeholder="Min." value={newMinute} onChange={e => setNewMinute(e.target.value)} style={{ width: 56 }} />
              <input className="edit" type="text" placeholder="Buteur (optionnel)" value={newScorer} onChange={e => setNewScorer(e.target.value)} style={{ flex: 1, minWidth: 100 }} />
              <button type="submit" className="btn primary small">⚽ But</button>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// Group standings table
// ============================================================
function GroupTable({ title, teams, isAdmin, onUpdate, onDelete, onAdd }) {
  return (
    <div className="group-card">
      <div className="gtitle">{title}</div>
      <table className="stand">
        <thead>
          <tr>
            <th>Filière</th><th>J</th><th>BM</th><th>BE</th><th>DB</th><th>Pts</th>{isAdmin && <th></th>}
          </tr>
        </thead>
        <tbody>
          {teams.length === 0 ? (
            <tr><td colSpan={7} className="empty">Aucune filière</td></tr>
          ) : (
            teams.map(t => (
              <tr key={t.id}>
                {isAdmin ? (
                  <>
                    <td><input className="edit team-name" defaultValue={t.name} onChange={e => onUpdate(t.id, { name: e.target.value })} /></td>
                    <td><input className="edit" type="number" defaultValue={t.j} onChange={e => onUpdate(t.id, { j: parseInt(e.target.value, 10) || 0 })} /></td>
                    <td><input className="edit" type="number" defaultValue={t.bm} onChange={e => onUpdate(t.id, { bm: parseInt(e.target.value, 10) || 0 })} /></td>
                    <td><input className="edit" type="number" defaultValue={t.be} onChange={e => onUpdate(t.id, { be: parseInt(e.target.value, 10) || 0 })} /></td>
                    <td>{t.bm - t.be}</td>
                    <td><input className="edit" type="number" defaultValue={t.pts} onChange={e => onUpdate(t.id, { pts: parseInt(e.target.value, 10) || 0 })} /></td>
                    <td><button className="btn danger small" onClick={() => onDelete(t.id)}>✕</button></td>
                  </>
                ) : (
                  <>
                    <td>{t.name}</td>
                    <td>{t.j}</td>
                    <td>{t.bm}</td>
                    <td>{t.be}</td>
                    <td>{t.bm - t.be >= 0 ? "+" : ""}{t.bm - t.be}</td>
                    <td className="pts">{t.pts}</td>
                  </>
                )}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {isAdmin && (
        <div className="add-row">
          <button className="btn small ghost" onClick={onAdd}>+ Ajouter une filière</button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Scorer row
// ============================================================
function ScorerRow({ s, rank, isAdmin, onUpdate, onDelete }) {
  const rankClass = rank === 1 ? "rank-1" : rank === 2 ? "rank-2" : rank === 3 ? "rank-3" : "rank-other";

  if (isAdmin) {
    return (
      <tr>
        <td><span className={`rank-badge ${rankClass}`}>{rank}</span></td>
        <td><input className="edit scorer-name" defaultValue={s.player} onChange={e => onUpdate(s.id, { player: e.target.value })} /></td>
        <td><input className="edit scorer-fil" defaultValue={s.fil} onChange={e => onUpdate(s.id, { fil: e.target.value })} /></td>
        <td><input className="edit scorer-goals" type="number" defaultValue={s.buts} onChange={e => onUpdate(s.id, { buts: parseInt(e.target.value, 10) || 0 })} /></td>
        <td><button className="btn danger small" onClick={() => onDelete(s.id)}>✕</button></td>
      </tr>
    );
  }

  return (
    <tr>
      <td><span className={`rank-badge ${rankClass}`}>{rank}</span></td>
      <td>{s.player}</td>
      <td>{s.fil}</td>
      <td className="goals-cell">{s.buts}</td>
    </tr>
  );
}
