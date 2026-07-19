// Usage: DATABASE_URL="postgresql://..." node scripts/init-db.mjs
// Crée les tables si besoin puis insère les données de départ (uniquement si les tables sont vides).

import { neon } from "@neondatabase/serverless";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL manquant. Exemple :");
  console.error('  DATABASE_URL="postgresql://..." node scripts/init-db.mjs');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

async function run() {
  const schema = readFileSync(join(__dirname, "..", "db", "schema.sql"), "utf8");
  const schemaStatements = schema.split(";").map(s => s.trim()).filter(Boolean);
  for (const stmt of schemaStatements) {
    await sql(stmt);
  }
  console.log("✔ Tables créées (ou déjà existantes).");

  const [{ count: matchCount }] = await sql`SELECT COUNT(*)::int AS count FROM matches`;
  if (matchCount === 0) {
    const seed = readFileSync(join(__dirname, "..", "db", "seed.sql"), "utf8");
    const seedStatements = seed.split(";").map(s => s.trim()).filter(Boolean);
    for (const stmt of seedStatements) {
      await sql(stmt);
    }
    console.log("✔ Données de départ insérées (programme, classements, buteurs).");
  } else {
    console.log("ℹ Des matchs existent déjà, données de départ non réinsérées.");
  }

  console.log("Terminé.");
}

run().catch(err => {
  console.error("Erreur :", err);
  process.exit(1);
});
