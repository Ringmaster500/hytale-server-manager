import Docker from 'dockerode';

const docker = new Docker({ 
  socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock' 
});

export const DATA_DIR = process.env.DATA_DIR || '/DATA/AppData/hytale-manager/instances';
export const HYTALE_IMAGE_NAME = process.env.HYTALE_IMAGE || 'hytale-server';

export default docker;
