const COUNT_API_BASE = 'https://api.countapi.xyz';

function resolveCounterKey(counter) {
  if (counter === 'visits') {
    return process.env.COUNTER_KEY_VISITS || 'visit-log';
  }
  if (counter === 'images') {
    return process.env.COUNTER_KEY_IMAGES || 'image-log';
  }
  return null;
}

export default async function handler(req, res) {
  const action = req.query?.action;
  const counter = req.query?.counter;
  const namespace = process.env.COUNTER_NAMESPACE;

  if (!namespace) {
    return res.status(500).json({ error: 'Missing COUNTER_NAMESPACE' });
  }
  if (action !== 'get' && action !== 'hit') {
    return res.status(400).json({ error: 'Invalid action' });
  }

  const counterKey = resolveCounterKey(counter);
  if (!counterKey) {
    return res.status(400).json({ error: 'Invalid counter type' });
  }

  try {
    const endpoint = `${COUNT_API_BASE}/${action}/${encodeURIComponent(namespace)}/${encodeURIComponent(counterKey)}`;
    const response = await fetch(endpoint);
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Counter provider error' });
    }
    const data = await response.json();
    return res.status(200).json({ value: Number(data.value || 0) });
  } catch (_error) {
    return res.status(500).json({ error: 'Counter request failed' });
  }
}
