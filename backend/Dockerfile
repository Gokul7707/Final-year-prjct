FROM node:20-bookworm-slim

# Phase 1 CAD = headless Blender (bpy). OpenSCAD kept optional for legacy scripts.
RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    blender \
    ca-certificates \
    libgl1 \
    libxrender1 \
    libxi6 \
    libxkbcommon0 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

COPY . .

RUN npm run build

ENV PORT=5000
ENV BLENDER_PATH=/usr/bin/blender
ENV BLENDER_SCRIPT=/project/cad/blender/generate_multirotor.py
ENV PROJECT_ROOT=/project
ENV OUTPUT_DIR=/project/output/chassis
ENV JOBS_DATA_DIR=/project/backend/data/jobs

EXPOSE 5000

CMD ["npm", "start"]
