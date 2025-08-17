const { supabase } = require('../../../lib/supabase');

module.exports = async (req, res) => {
  // CORS for local testing or cross-origin use
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('licenses')
      .select('*')
      .order('id', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });

    // Map to camelCase expected by frontend
    const rows = (data || []).map(r => ({
      id: r.id,
      name: r.name,
      designation: r.designation,
      licenseNo: r.license_no,
      tokenNo: r.token_no,
      issueDate: r.issue_date,
      validFrom: r.valid_from,
      validTo: r.valid_to
    }));
    return res.json(rows);
  }

  if (req.method === 'POST') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { name, designation, licenseNo, tokenNo, issueDate, validFrom, validTo } = body;

    // Friendly duplicate check (license_no OR token_no)
    const { data: existing, error: selErr } = await supabase
      .from('licenses')
      .select('id')
      .or(`license_no.eq.${licenseNo},token_no.eq.${tokenNo}`)
      .limit(1)
      .maybeSingle();

    if (selErr) return res.status(500).json({ error: selErr.message });
    if (existing) {
      return res.json({
        message: '⚠️ A record with this License No or Token No already exists. You can edit it instead.'
      });
    }

    const { error: insErr, data: insData } = await supabase
      .from('licenses')
      .insert({
        name,
        designation,
        license_no: licenseNo,
        token_no: tokenNo,
        issue_date: issueDate,
        valid_from: validFrom,
        valid_to: validTo
      })
      .select('id') // return created id
      .single();

    if (insErr) {
      // If unique constraint still tripped due to race, show friendly message
      if (insErr.code === '23505') {
        return res.json({ message: '⚠️ This License No or Token No already exists. Try editing it.' });
      }
      return res.status(500).json({ error: insErr.message });
    }

    return res.json({ message: '✅ Record added successfully.', id: insData.id });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};
