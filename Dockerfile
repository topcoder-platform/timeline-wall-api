# Use the base image with Node.js
FROM node:16-bullseye

# Copy the current directory into the Docker image
COPY . /timeline-backend

# Set working directory for future use
WORKDIR /timeline-backend

# Install the dependencies from package.json
RUN npm install

CMD npm start