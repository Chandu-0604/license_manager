const { supabase } = require('../../../lib/supabase');

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const { id } = req.query;
  const numericId = Number(id);
  if (!numericId) return res.status(400).json({ error: 'Invalid id' });

  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('licenses')
      .select('*')
      .eq('id', numericId)
      .single();

    if (error) return res.status(404).json({ error: 'Not found' });

    return res.json({
      id: data.id,
      name: data.name,
      designation: data.designation,
      licenseNo: data.license_no,
      tokenNo: data.token_no,
      issueDate: data.issue_date,
      validFrom: data.valid_from,
      validTo: data.valid_to
    });
  }

  if (req.method === 'PUT') {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const { name, designation, licenseNo, tokenNo, issueDate, validFrom, validTo } = body;

    // Prevent duplicates against other rows
    const { data: clash, error: selErr } = await supabase
      .from('licenses')
      .select('id')
      .or(`license_no.eq.${licenseNo},token_no.eq.${tokenNo}`)
      .neq('id', numericId)
      .limit(1)
      .maybeSingle();

    if (selErr) return res.status(500).json({ error: selErr.message });
    if (clash) {
      return res.json({ message: '⚠️ Another record already uses that License No or Token No.' });
    }

    const { error: updErr } = await supabase
      .from('licenses')
      .update({
        name,
        designation,
        license_no: licenseNo,
        token_no: tokenNo,
        issue_date: issueDate,
        valid_from: validFrom,
        valid_to: validTo
      })
      .eq('id', numericId);

    if (updErr) {
      if (updErr.code === '23505') {
        return res.json({ message: '⚠️ Duplicate License No or Token No.' });
      }
      return res.status(500).json({ error: updErr.message });
    }

    return res.json({ message: '✏️ Record updated successfully.' });
  }

  if (req.method === 'DELETE') {
    const { error } = await supabase.from('licenses').delete().eq('id', numericId);
    if (error) return res.status(500).json({ error: error.message });
    return res.json({ message: '🗑️ Record deleted successfully.' });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
};
