function json(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(payload));
}

function getOrigin(req) {
  var host = req.headers['x-forwarded-host'] || req.headers.host;
  var proto = req.headers['x-forwarded-proto'] || 'https';
  return proto + '://' + host;
}

function normalizeItems(items) {
  if (!Array.isArray(items)) return [];

  return items
    .map(function (item) {
      var qty = Math.max(1, parseInt(item.qty || 1, 10));
      var size = item.size === 'adult' ? 'adult' : 'child';

      return {
        qty: qty,
        size: size,
        name: 'Mossy the Dino Hoodie - ' + (size === 'adult' ? 'Adult fit' : 'Child fit')
      };
    })
    .filter(function (item) {
      return Number.isFinite(item.qty) && item.qty > 0;
    });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return json(res, 405, { error: 'Method Not Allowed' });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return json(res, 500, { error: 'Missing STRIPE_SECRET_KEY' });
  }

  var body = req.body;

  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      return json(res, 400, { error: 'Invalid JSON body' });
    }
  }

  var items = normalizeItems(body && body.items);
  if (!items.length) {
    return json(res, 400, { error: 'Cart is empty' });
  }

  var origin = getOrigin(req);
  var params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('success_url', origin + '/?checkout=success&session_id={CHECKOUT_SESSION_ID}');
  params.set('cancel_url', origin + '/?checkout=cancel#buy');
  params.set('billing_address_collection', 'auto');
  params.set('allow_promotion_codes', 'true');
  params.set('shipping_address_collection[allowed_countries][0]', 'US');

  items.forEach(function (item, index) {
    params.set('line_items[' + index + '][quantity]', String(item.qty));
    params.set('line_items[' + index + '][price_data][currency]', 'usd');
    params.set('line_items[' + index + '][price_data][unit_amount]', '4900');
    params.set('line_items[' + index + '][price_data][product_data][name]', item.name);
    params.set(
      'line_items[' + index + '][price_data][product_data][description]',
      'Wearable dinosaur hood and tail set'
    );
  });

  params.set('metadata[site]', 'mossy-the-dino');
  params.set('metadata[item_count]', String(items.length));

  try {
    var stripeRes = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer ' + process.env.STRIPE_SECRET_KEY,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params
    });

    var payload = await stripeRes.json();

    if (!stripeRes.ok) {
      return json(res, stripeRes.status, {
        error: payload && payload.error && payload.error.message
          ? payload.error.message
          : 'Stripe session creation failed'
      });
    }

    return json(res, 200, {
      id: payload.id,
      url: payload.url
    });
  } catch (error) {
    return json(res, 500, { error: 'Unable to contact Stripe' });
  }
};
