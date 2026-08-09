FROM node:20-bookworm-slim

# Phase 1 CAD pillar = OpenSCAD whoop STL
RUN apt-get update \
  && apt-get install -y --no-install-recommends openscad ca-certificates \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build

ENV PORT=5000
ENV OPENSCAD_PATH=/usr/bin/openscad
ENV PROJECT_ROOT=/project
ENV WHOOP_SCAD=/project/cad/whoop/whoop.scad
ENV OUTPUT_DIR=/project/output/chassis
ENV JOBS_DATA_DIR=/project/backend/data/jobs

EXPOSE 5000

CMD ["npm", "start"]
