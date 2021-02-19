set -e

./stop.sh

docker-compose --env-file ./version up --scale api-server=2 -d
