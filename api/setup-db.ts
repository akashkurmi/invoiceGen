import { sql } from './db.js';

export default async function handler(req: any, res: any) {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS outfits (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        "purchaseValue" INTEGER NOT NULL
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS rentals (
        id SERIAL PRIMARY KEY,
        "memberName" VARCHAR(255) NOT NULL,
        phone VARCHAR(255) NOT NULL,
        outfit VARCHAR(255) NOT NULL,
        "rentDate" VARCHAR(255) NOT NULL,
        "returnDate" VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL,
        price INTEGER NOT NULL,
        advance INTEGER NOT NULL
      );
    `;
    return res.status(200).json({ message: "Tables created successfully!" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
