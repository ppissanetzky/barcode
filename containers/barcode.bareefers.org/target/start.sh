
docker-compose down
docker load < ./web-server.tgz
docker load < ./api-server.tgz
docker-compose build
docker-compose up --scale api-server=2
