import docker, { HYTALE_IMAGE_NAME } from './docker';
import { exec } from 'child_process';
import path from 'path';
import { promisify } from 'util';
import { Readable } from 'stream';

const execPromise = promisify(exec);

export async function buildBaseImage() {
  const dockerDir = path.join(process.cwd(), 'docker', 'hytale-server');
  
  // We use the dockerode buildImage or a shell command if needed.
  // Using shell command is easier for context management in some environments.
  // However, since we are inside a container, we can also use 'tar' and pass to dockerode.
  
  console.log(`Building image ${HYTALE_IMAGE_NAME} from ${dockerDir}...`);
  
  // Since we have 'tar' in the container, we can stream the context to the docker daemon via the socket
  // Alternatively, we can just use the dockerode library's buildImage with a tar stream.
  
  // For simplicity and to ensure it works across different setups, let's use a small script that tars and sends.
  // But wait, Dockerode is already here. Let's try to use it properly.
  
  try {
    // Build image using the Dockerfile in the dockerDir
    // We assume the caller or the environment has already ensured the files exist.
    
    // We need to create a tar stream of the directory
    const { stdout, stderr } = await execPromise(`tar -c -C ${dockerDir} .`);
    
    // Create a readable stream from the tar output
    const tarStream = Readable.from(stdout);
    
    return new Promise((resolve, reject) => {
      docker.buildImage(tarStream, { t: HYTALE_IMAGE_NAME }, (err, stream) => {
        if (err) return reject(err);
        if (!stream) return reject(new Error('No stream returned from buildImage'));
        
        docker.modem.followProgress(stream, (err, res) => {
          if (err) return reject(err);
          resolve(res);
        }, (event) => {
          if (event.stream) {
            process.stdout.write(event.stream);
          }
        });
      });
    });
  } catch (error) {
    console.error('Error building base image:', error);
    throw error;
  }
}

export async function checkImageExists() {
  try {
    const images = await docker.listImages();
    return images.some(img => 
      img.RepoTags && img.RepoTags.includes(`${HYTALE_IMAGE_NAME}:latest`)
    );
  } catch (error) {
    console.error('Error checking image existence:', error);
    return false;
  }
}
