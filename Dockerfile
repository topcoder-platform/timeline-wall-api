# Use the base image with Node.js
FROM node:16-bullseye

# Copy the current directory into the Docker image
COPY . /timeline-wall-api

# Set working directory for future use
WORKDIR /timeline-wall-api

# Install the dependencies from package.json
RUN npm install

CMD node app.js
