"use client";

import SiteShell from "../components/SiteShell";

const teams = [
  { id: 1, name: "Filière A", coach: "Coach Mampouya", players: 18, stadium: "Complexe ESTAM" },
  { id: 2, name: "Filière B", coach: "Coach Ikounga", players: 17, stadium: "Stade secondaire" }
];

export default function TeamsPage() {
  return (
    <SiteShell title="Équipes & informations" subtitle="Présentation des équipes, leur staff, leur effectif et les informations utiles avant chaque rencontre.">
      <div className="grid-2">
        {teams.map(team => (
          <section className="card" key={team.id}>
            <div className="card-head">
              <h3>{team.name}</h3>
              <div className="pill">{team.coach}</div>
            </div>
            <div className="meta-grid">
              <div className="metric-card">
                <span>Coach</span>
                <strong>{team.coach}</strong>
              </div>
              <div className="metric-card">
                <span>Joueurs</span>
                <strong>{team.players}</strong>
              </div>
              <div className="metric-card">
                <span>Base</span>
                <strong>{team.stadium}</strong>
              </div>
            </div>
          </section>
        ))}
      </div>
    </SiteShell>
  );
}
