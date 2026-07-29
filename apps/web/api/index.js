import app from '../../api/src/server.js';

// TemanQRIS signatures must be verified against the untouched request body.
export const config = {
  api: {
    bodyParser: false,
  },
};

export default function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  const rewrittenPath = url.searchParams.get('path');

  if (rewrittenPath && (url.pathname === '/api' || url.pathname === '/api/index')) {
    url.searchParams.delete('path');
    const query = url.searchParams.toString();
    req.url = `/api/${rewrittenPath}${query ? `?${query}` : ''}`;
  }

  return app(req, res);
}
