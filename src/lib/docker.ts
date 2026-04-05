import Docker from 'dockerode';

const isWindows = process.platform === 'win32';
const socketPath = process.env.DOCKER_SOCKET || (isWindows ? '//./pipe/docker_engine' : '/var/run/docker.sock');

const docker = new Docker({ socketPath });

export const DATA_DIR = process.env.DATA_DIR || '/DATA/AppData/hytale-manager/instances';
export const HYTALE_IMAGE_NAME = process.env.HYTALE_IMAGE || 'hytale-server';

export default docker;
