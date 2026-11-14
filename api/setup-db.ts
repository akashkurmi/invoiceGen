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

    await sql`
      CREATE TABLE IF NOT EXISTS makeup_bookings (
        id SERIAL PRIMARY KEY,
        "clientName" VARCHAR(255) NOT NULL,
        phone VARCHAR(255),
        email VARCHAR(255),
        "bookingDate" VARCHAR(255) NOT NULL,
        advance INTEGER NOT NULL,
        "totalPrice" INTEGER NOT NULL,
        venue VARCHAR(255),
        services TEXT,
        "noOfServices" INTEGER NOT NULL DEFAULT 1,
        "travelAmount" INTEGER DEFAULT 0
      );
    `;

    // Ensure services column is TEXT so it supports JSON data of any size without losing data
    await sql`
      ALTER TABLE makeup_bookings 
      ALTER COLUMN services TYPE TEXT;
    `;
    return res.status(200).json({ message: "Tables created/updated successfully!" });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
