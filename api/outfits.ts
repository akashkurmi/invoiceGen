import { sql } from './db.js';

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    const result = await sql`SELECT * FROM outfits ORDER BY id DESC`;
    return res.status(200).json(result);
  }
  
  if (req.method === 'POST') {
    const { name, purchaseValue } = req.body;
    const result = await sql`
      INSERT INTO outfits (name, "purchaseValue") 
      VALUES (${name}, ${purchaseValue}) 
      RETURNING *
    `;
    return res.status(201).json(result[0]);
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
