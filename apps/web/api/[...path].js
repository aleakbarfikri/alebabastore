import app from '../../api/src/server.js';

// TemanQRIS signatures must be verified against the untouched request body.
// Vercel loads database credentials and application secrets at function startup.
export const config = {
  api: {
    bodyParser: false,
  },
};

export default app;
