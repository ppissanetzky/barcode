set -e

# The base directory

BASE_DIR=/home/admin3/barcode-data

# The directory where uploads will go

BC_UPLOADS_DIR=${BASE_DIR}/uploads/bc/uploads

# The directory where the databases will go

BC_DATABASE_DIR=${BASE_DIR}/databases

# The directory that holds the static site

SITE_DIR=${BASE_DIR}/site/bc

# Make all the directories

mkdir -p ${BC_UPLOADS_DIR}
mkdir -p ${BC_DATABASE_DIR}
mkdir -p ${SITE_DIR}

# npm install

(cd site && npm ci)
(cd server && npm ci)

# Build it

npm run generate

# Clean and copy the build to the site directory

rm -rf ${SITE_DIR}/*
cp -r -v ./site/dist/* ${SITE_DIR}/

# Restart the server

pm2 restart ./pm2-ecosystem.config.js
