function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return json(res, 405, { error: 'Method Not Allowed' });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return json(res, 500, { error: 'Missing STRIPE_SECRET_KEY' });
  }

  var sessionId = req.query && req.query.session_id;
  if (!sessionId) {
    return json(res, 400, { error: 'Missing session_id' });
  }

  try {
    var stripeRes = await fetch(
      'https://api.stripe.com/v1/checkout/sessions/' + encodeURIComponent(sessionId),
      {
        headers: {
          Authorization: 'Bearer ' + process.env.STRIPE_SECRET_KEY
        }
      }
    );

    var payload = await stripeRes.json();

    if (!stripeRes.ok) {
      return json(res, stripeRes.status, {
        error: payload && payload.error && payload.error.message
          ? payload.error.message
          : 'Stripe session lookup failed'
      });
    }

    return json(res, 200, {
      id: payload.id,
      status: payload.status,
      payment_status: payload.payment_status
    });
  } catch (error) {
    return json(res, 500, { error: 'Unable to contact Stripe' });
  }
};
