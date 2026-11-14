import { sql } from './db.js';

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    const result = await sql`SELECT * FROM makeup_bookings ORDER BY id DESC`;
    return res.status(200).json(result);
  }
  
  if (req.method === 'POST') {
    const { clientName, phone, email, bookingDate, advance, totalPrice, venue, services, noOfServices, travelAmount } = req.body;
    const servicesVal = typeof services === 'object' ? JSON.stringify(services) : (services ?? '');
    const result = await sql`
      INSERT INTO makeup_bookings ("clientName", phone, email, "bookingDate", advance, "totalPrice", venue, services, "noOfServices", "travelAmount") 
      VALUES (${clientName}, ${phone}, ${email}, ${bookingDate}, ${advance}, ${totalPrice}, ${venue}, ${servicesVal}, ${noOfServices}, ${travelAmount}) 
      RETURNING *
    `;
    return res.status(201).json(result[0]);
  }

  if (req.method === 'PUT') {
    const { id, clientName, phone, email, bookingDate, advance, totalPrice, venue, services, noOfServices, travelAmount } = req.body;
    const servicesVal = typeof services === 'object' ? JSON.stringify(services) : (services ?? '');
    const result = await sql`
      UPDATE makeup_bookings 
      SET "clientName" = ${clientName}, phone = ${phone}, email = ${email}, "bookingDate" = ${bookingDate}, advance = ${advance}, "totalPrice" = ${totalPrice}, venue = ${venue}, services = ${servicesVal}, "noOfServices" = ${noOfServices}, "travelAmount" = ${travelAmount}
      WHERE id = ${id}
      RETURNING *
    `;
    return res.status(200).json(result[0]);
  }

  if (req.method === 'DELETE') {
    const id = req.query.id;
    await sql`DELETE FROM makeup_bookings WHERE id = ${id}`;
    return res.status(204).end();
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
