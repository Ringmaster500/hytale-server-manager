import { NextResponse } from 'next/server';
import docker, { DATA_DIR, HYTALE_IMAGE_NAME } from '@/lib/docker';
import { checkImageExists, buildBaseImage } from '@/lib/docker-build';
import path from 'path';

export async function GET() {
  try {
    const containers = await docker.listContainers({ all: true });
    const hytaleServers = containers.filter((c: any) => 
      c.Image.includes(HYTALE_IMAGE_NAME) || 
      (c.Labels && c.Labels['app'] === 'hytale-manager')
    );
    
    const mappedServers = hytaleServers.map((c: any) => ({
      id: c.Id,
      name: c.Names[0].replace('/', ''),
      state: c.State,
      status: c.Status,
      image: c.Image,
      ports: c.Ports,
    }));
    
    return NextResponse.json({ servers: mappedServers });
  } catch (error: any) {
    console.error('Error fetching servers:', error);
    return NextResponse.json({ error: 'Failed to list servers' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, port = 25565 } = await req.json();
    
    // Auto-build the base image if it's missing
    if (!(await checkImageExists())) {
      console.log(`Image ${HYTALE_IMAGE_NAME} missing. Triggering auto-build...`);
      await buildBaseImage();
      console.log(`Auto-build of ${HYTALE_IMAGE_NAME} complete.`);
    }
    
    if (!name) {
      return NextResponse.json({ error: 'Server name is required' }, { status: 400 });
    }
    
    const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
    const instanceDir = path.join(DATA_DIR, safeName);
    
    const containerParams: any = {
      Image: HYTALE_IMAGE_NAME,
      name: `hytale-${safeName}`,
      Labels: {
        'app': 'hytale-manager'
      },
      Env: [
        `SERVER_NAME=${name}`,
        `SERVER_PORT=${port}`
      ],
      ExposedPorts: {
        '25565/tcp': {},
        '25565/udp': {}
      },
      HostConfig: {
        PortBindings: {
          '25565/tcp': [{ HostPort: port.toString() }],
          '25565/udp': [{ HostPort: port.toString() }]
        },
        Binds: [
          `${instanceDir}:/app/data`
        ],
        RestartPolicy: { Name: 'unless-stopped' }
      }
    };

    const container = await docker.createContainer(containerParams);
    await container.start();
    
    return NextResponse.json({ message: 'Server created successfully', id: container.id });
  } catch (error: any) {
    console.error('Error creating server:', error);
    return NextResponse.json({ error: 'Failed to create server', details: error.message }, { status: 500 });
  }
}
