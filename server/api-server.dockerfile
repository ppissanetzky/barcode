# Ubuntu
FROM ubuntu:20.04

ARG DEBIAN_FRONTEND=noninteractive

# Install curl to install nvm
RUN apt-get update \
    && apt-get install -y curl \
    && apt-get -y autoclean

# Setup for nvm
ENV NVM_DIR /home/nvm
ENV NODE_VERSION 14.16.0
RUN mkdir $NVM_DIR

# Install nvm, which will install node
RUN curl --silent -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.38.0/install.sh | bash

# Now, get rid of curl
RUN apt-get purge -y curl \
    && apt-get -y autoremove \
    && apt-get -y clean

# Add node and npm to path so the commands are available
ENV NODE_PATH $NVM_DIR/v$NODE_VERSION/lib/node_modules
ENV PATH $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

# confirm installation
RUN node -v
RUN npm -v

# This is where the application lives
WORKDIR /home/node/app

# Copy package files into the container
COPY package.json package-lock.json ./

# Now, install node modules inside the container
RUN npm ci --only prod

# Copy the server code
COPY . .

# Set the OS time zone
RUN apt-get install tzdata
ENV TZ=America/Los_Angeles
RUN ln -snf /usr/share/zoneinfo/$TZ /etc/localtime && echo $TZ > /etc/timezone
RUN dpkg-reconfigure tzdata
RUN date

# Command to start the server
CMD ["node", "server.js"]
