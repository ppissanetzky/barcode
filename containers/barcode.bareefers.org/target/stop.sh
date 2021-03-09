set -e

# Prune images older than a week

docker image prune -a --force --filter "until=168h"

# Set them to not restart

docker update --restart=no $(docker ps -aq)

# Stop all containers

docker stop $(docker ps -aq)

# Remove them

docker container rm $(docker ps -aq)

# Prune old networks

docker network prune --force
