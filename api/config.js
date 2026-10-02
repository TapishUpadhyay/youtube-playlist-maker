// Public OAuth Client ID (not a secret). Set GOOGLE_CLIENT_ID in Vercel.
module.exports = (req, res) => res.json({ clientId: process.env.GOOGLE_CLIENT_ID || '' });