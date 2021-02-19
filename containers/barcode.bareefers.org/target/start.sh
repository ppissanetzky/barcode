set -e

docker load < ./web-server.tgz
docker load < ./api-server.tgz

./stop.sh

docker-compose up --scale api-server=2 -d
