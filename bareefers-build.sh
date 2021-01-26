set -e

# The base URL of the server

BASE_URL=https://bareefers.org

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

npm i

# Build it

npx nuxt generate

# Copy the build to the site directory

cp -r -v ./dist/* ${SITE_DIR}/

# Restart the server

pm2 restart ./pm2-ecosystem.config.js
