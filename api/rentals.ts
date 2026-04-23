import { sql } from './db.js';

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    const result = await sql`SELECT * FROM rentals ORDER BY id DESC`;
    return res.status(200).json(result);
  }
  
  if (req.method === 'POST') {
    const { memberName, phone, outfit, rentDate, returnDate, status, price, advance } = req.body;
    const result = await sql`
      INSERT INTO rentals ("memberName", phone, outfit, "rentDate", "returnDate", status, price, advance) 
      VALUES (${memberName}, ${phone}, ${outfit}, ${rentDate}, ${returnDate}, ${status}, ${price}, ${advance}) 
      RETURNING *
    `;
    return res.status(201).json(result[0]);
  }

  if (req.method === 'PUT') {
    const { id, memberName, phone, outfit, rentDate, returnDate, status, price, advance } = req.body;
    const result = await sql`
      UPDATE rentals 
      SET "memberName" = ${memberName}, phone = ${phone}, outfit = ${outfit}, "rentDate" = ${rentDate}, "returnDate" = ${returnDate}, status = ${status}, price = ${price}, advance = ${advance}
      WHERE id = ${id}
      RETURNING *
    `;
    return res.status(200).json(result[0]);
  }

  if (req.method === 'DELETE') {
    const id = req.query.id;
    await sql`DELETE FROM rentals WHERE id = ${id}`;
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
