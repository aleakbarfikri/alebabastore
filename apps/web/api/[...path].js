import app from '../../api/src/server.js';

// TemanQRIS signatures must be verified against the untouched request body.
export const config = {
  api: {
    bodyParser: false,
  },
};

export default app;
