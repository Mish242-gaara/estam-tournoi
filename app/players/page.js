"use client";

import SiteShell from "../components/SiteShell";

const players = [
  { id: 1, name: "Ndinga", position: "Attaquant", team: "Filière A", status: "Titulaire" },
  { id: 2, name: "Mabiala", position: "Milieu", team: "Filière B", status: "Remplaçant" }
];

export default function PlayersPage() {
  return (
    <SiteShell title="Joueurs & staff" subtitle="Les coachs peuvent ensuite enrichir cette vue avec une gestion de l’effectif, des statuts et de la validation admin.">
      <section className="card">
        <div className="card-head">
          <h3>Effectif</h3>
          <div className="pill">Validation admin</div>
        </div>
        <div className="stack">
          {players.map(player => (
            <div className="player-row" key={player.id}>
              <div>
                <strong>{player.name}</strong>
                <div className="muted">{player.position} · {player.team}</div>
              </div>
              <div className="pill">{player.status}</div>
            </div>
          ))}
        </div>
      </section>
    </SiteShell>
  );
}
