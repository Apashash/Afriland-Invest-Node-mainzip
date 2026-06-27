const path = require('path');

const ROOT = path.join(__dirname, '..');

module.exports = {
  UPLOADS_DIR: path.join(ROOT, 'uploads'),
  CLIENT_DIST: path.join(ROOT, 'dist', 'public'),
};
