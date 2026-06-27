const path = require('path');

const ROOT = process.cwd();
const isProd = process.env.NODE_ENV === 'production';

module.exports = {
  UPLOADS_DIR: path.join(ROOT, 'uploads'),
  CLIENT_DIST: isProd
    ? path.join(ROOT, 'dist', 'public')
    : path.join(ROOT, 'client', 'dist'),
};
