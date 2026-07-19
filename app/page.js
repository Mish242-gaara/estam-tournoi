"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const TABS = [
  { key: "accueil", label: "Accueil" },
  { key: "programme", label: "Programme" },
  { key: "classements", label: "Classements" },
  { key: "buteurs", label: "Buteurs" }
];

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

  const [isAdmin, setIsAdmin] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const [pinErr, setPinErr] = useState("");
  const pinRef = useRef("");

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
    const stored = typeof window !== "undefined" ? sessionStorage.getItem("estam_admin_pin") : null;
    if (stored) pinRef.current = stored;
  }, [loadAll]);

  // ---------- admin session ----------
  async function confirmPin() {
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pinValue })
      });
      const data = await res.json();
      if (data.ok) {
        pinRef.current = pinValue;
        sessionStorage.setItem("estam_admin_pin", pinValue);
        setIsAdmin(true);
        setModalOpen(false);
        showToast("Mode organisateur activé");
      } else {
        setPinErr("Code incorrect.");
      }
    } catch (e) {
      setPinErr("Erreur de connexion au serveur.");
    }
  }
  function toggleAdmin() {
    if (isAdmin) {
      setIsAdmin(false);
      pinRef.current = "";
      sessionStorage.removeItem("estam_admin_pin");
      showToast("Mode organisateur désactivé");
    } else {
      setPinValue("");
      setPinErr("");
      setModalOpen(true);
    }
  }

  // ---------- generic mutate helper ----------
  async function apiMutate(path, method, body) {
    const res = await fetch(path, {
      method,
      headers: { "Content-Type": "application/json", "x-admin-pin": pinRef.current },
      body: body !== undefined ? JSON.stringify(body) : undefined
    });
    if (res.status === 401) {
      setIsAdmin(false);
      showToast("Session organisateur expirée, reconnectez-vous.", true);
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
  const sortedScorers = [...scorers].sort((a, b) => b.buts - a.buts);
  const matchesByDate = sortedMatches.reduce((acc, m) => {
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
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button id="adminBtn" className={isAdmin ? "on" : ""} onClick={toggleAdmin}>
              {isAdmin ? "Organisateur ✓" : "Mode organisateur"}
            </button>
            <button className="mobile-toggle" onClick={() => setNavOpen(o => !o)}>☰</button>
          </div>
        </div>
      </header>

      <div className="hero">
        <div className="stripes tl" />
        <div className="stripes red br" />
        <div className="wrap">
          <div className="eyebrow">Phase de groupes · Pointe-Noire</div>
          <h1>Tournoi <span>Inter-Filières</span><br />ESTAM 2026</h1>
          <p className="lead">Programme des matchs, classements et meilleurs buteurs de la phase Pointe-Noire, mis à jour en direct par les organisateurs.</p>

          <div className="finale-banner">
            <div className="icon">🏆</div>
            <div className="txt">
              <b>La grande finale</b>
              <span>Le vainqueur de Pointe-Noire affrontera le vainqueur de la phase de Brazzaville pour le titre national.</span>
            </div>
          </div>

          <Scoreboard match={nextMatch} isLive={Boolean(live)} loading={loading} />
        </div>
      </div>

      <div className="wrap">
        {tab === "accueil" && (
          <section className="tab active">
            <div className="section-head">
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
                      <MatchCard key={m.id} m={m} isAdmin={isAdmin} onUpdate={updateMatch} onDelete={deleteMatch} />
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

      <div className={`modal-bg${modalOpen ? " open" : ""}`}>
        <div className="modal">
          <h3>Accès organisateur</h3>
          <p>Entrez le code organisateur pour modifier le programme, les classements et les buteurs. Ce code protège contre les erreurs de saisie accidentelles, ce n'est pas une sécurité forte.</p>
          <input
            type="password"
            placeholder="Code organisateur"
            value={pinValue}
            onChange={e => setPinValue(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") confirmPin(); }}
            autoFocus={modalOpen}
          />
          <div className="modal-err">{pinErr}</div>
          <div className="modal-actions">
            <button className="btn ghost" onClick={() => setModalOpen(false)}>Annuler</button>
            <button className="btn primary" onClick={confirmPin}>Entrer</button>
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================
// Scoreboard
// ============================================================
function Scoreboard({ match, isLive, loading }) {
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
        <div className={`status ${statusClass}`}>{statusLabel}</div>
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

// ============================================================
// Match card (view + admin edit)
// ============================================================
function MatchCard({ m, isAdmin, onUpdate, onDelete }) {
  if (isAdmin) {
    return (
      <div className="match-card">
        <input className="edit date" type="date" defaultValue={m.date} onChange={e => onUpdate(m.id, { date: e.target.value })} />
        <input className="edit time" type="time" defaultValue={m.time} onChange={e => onUpdate(m.id, { time: e.target.value })} />
        <div className="match-teams">
          <input className="edit team" defaultValue={m.teamA} onChange={e => onUpdate(m.id, { teamA: e.target.value })} />
          <input className="edit score" type="number" defaultValue={m.scoreA ?? ""} placeholder="-" onChange={e => onUpdate(m.id, { scoreA: e.target.value === "" ? null : parseInt(e.target.value, 10) })} />
          <span className="sep">VS</span>
          <input className="edit score" type="number" defaultValue={m.scoreB ?? ""} placeholder="-" onChange={e => onUpdate(m.id, { scoreB: e.target.value === "" ? null : parseInt(e.target.value, 10) })} />
          <input className="edit team" defaultValue={m.teamB} onChange={e => onUpdate(m.id, { teamB: e.target.value })} />
        </div>
        <select className="edit" defaultValue={m.group} onChange={e => onUpdate(m.id, { group: e.target.value })}>
          <option value="A">Groupe A</option>
          <option value="B">Groupe B</option>
        </select>
        <select className="edit" defaultValue={m.status} onChange={e => onUpdate(m.id, { status: e.target.value })}>
          <option value="upcoming">À venir</option>
          <option value="live">En direct</option>
          <option value="done">Terminé</option>
        </select>
        <div className="match-admin">
          <button className="btn danger small" onClick={() => onDelete(m.id)}>Supprimer</button>
        </div>
      </div>
    );
  }

  const hasScore = m.scoreA !== null && m.scoreA !== undefined && m.scoreB !== null && m.scoreB !== undefined;
  const statusClass = m.status === "done" ? "status-done" : m.status === "live" ? "status-live" : "status-upcoming";
  const statusLabel = m.status === "done" ? "Terminé" : m.status === "live" ? "En direct" : "À venir";

  return (
    <div className="match-card">
      <div className="match-time">{m.time}</div>
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
        <span className="tag">Groupe {m.group}</span>
        <span className={`tag ${statusClass}`}>{statusLabel}</span>
      </div>
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
