require('dotenv').config();
const express = require('express');
const cors = require('cors');
const Docker = require('dockerode');
const fs = require('fs');
const path = require('path');
const multer = require('multer');

const app = express();
const port = process.env.PORT || 4982;

app.use(cors());
app.use(express.json());

// Initialize Docker connection
const docker = new Docker({ socketPath: process.env.DOCKER_SOCKET || '/var/run/docker.sock' });

// Define CasaOS base directory for Hytale instances
const BASE_CASAOS_DIR = process.env.CASAOS_DIR || '/DATA/AppData/hytale-manager/instances';

const upload = multer({ dest: '/tmp/' });

// Helper to filter Hytale servers (Assuming they are tagged with a label or use specific image)
const HYTALE_IMAGE_NAME = process.env.HYTALE_IMAGE || 'hytale-server';

// ---------------------------------------------------------
// GET /servers - List active Hytale servers
// ---------------------------------------------------------
app.get('/servers', async (req, res) => {
    try {
        const containers = await docker.listContainers({ all: true });
        // Filter logic could be refined based on actual CasaOS container setup
        const hytaleServers = containers.filter(c => 
            c.Image.includes(HYTALE_IMAGE_NAME) || 
            (c.Labels && c.Labels['app'] === 'hytale-manager')
        );
        
        const mappedServers = hytaleServers.map(c => ({
            id: c.Id,
            name: c.Names[0].replace('/', ''),
            state: c.State,
            status: c.Status,
            image: c.Image,
            ports: c.Ports,
        }));
        
        res.json({ servers: mappedServers });
    } catch (error) {
        console.error('Error fetching servers:', error);
        res.status(500).json({ error: 'Failed to list servers' });
    }
});

// ---------------------------------------------------------
// POST /servers/create - Create a new Hytale Server
// ---------------------------------------------------------
app.post('/servers/create', async (req, res) => {
    try {
        const { name, port = 25565 } = req.body;
        
        if (!name) {
            return res.status(400).json({ error: 'Server name is required' });
        }
        
        const safeName = name.replace(/[^a-zA-Z0-9_-]/g, '').toLowerCase();
        const instanceDir = path.join(BASE_CASAOS_DIR, safeName);
        
        // Host config for creating the container
        const hostConfig = {
            PortBindings: {
                '25565/tcp': [{ HostPort: port.toString() }],
                '25565/udp': [{ HostPort: port.toString() }]
            },
            Binds: [
                `${instanceDir}:/app/data`
            ],
            RestartPolicy: { Name: 'unless-stopped' }
        };

        const containerParams = {
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
            HostConfig: hostConfig
        };

        const container = await docker.createContainer(containerParams);
        await container.start();
        
        res.json({ message: 'Server created successfully', id: container.id });
    } catch (error) {
        console.error('Error creating server:', error);
        res.status(500).json({ error: 'Failed to create server', details: error.message });
    }
});

// ---------------------------------------------------------
// POST /servers/:id/power - Start/Stop/Restart containers
// ---------------------------------------------------------
app.post('/servers/:id/power', async (req, res) => {
    try {
        const { id } = req.params;
        const { action } = req.body; // 'start', 'stop', 'restart'
        
        const container = docker.getContainer(id);
        
        if (action === 'start') {
            await container.start();
        } else if (action === 'stop') {
            await container.stop();
        } else if (action === 'restart') {
            await container.restart();
        } else {
            return res.status(400).json({ error: 'Invalid action. Use start, stop, or restart.' });
        }
        
        res.json({ message: `Container ${action}ed successfully` });
    } catch (error) {
        console.error(`Error performing ${req.body.action} on ${req.params.id}:`, error);
        res.status(500).json({ error: 'Failed to execute power action', details: error.message });
    }
});

// ---------------------------------------------------------
// POST /servers/:id/update - Trigger container restart seq
// ---------------------------------------------------------
app.post('/servers/:id/update', async (req, res) => {
    try {
        const { id } = req.params;
        const container = docker.getContainer(id);
        const containerInfo = await container.inspect();
        
        // Stop container before update
        if (containerInfo.State.Running) {
            await container.stop();
        }

        // Execute hytale-downloader within the container context or 
        // as a separate process mapped to the same volume.
        // Assuming the Hytale image has the downloader-cli built-in.
        const exec = await container.exec({
            Cmd: ['./hytale-downloader', '-download-path', 'update.zip'],
            AttachStdout: true,
            AttachStderr: true
        });

        const stream = await exec.start();
        
        // Logic to extract and replace files would typically happen in a startup script
        // or a dedicated update script inside the container.
        // For now, we trigger the download and restart which should invoke the 
        // container's internal entrypoint update logic.
        await container.start();
        
        res.json({ message: 'Update sequence started. Check container logs for progress.' });
    } catch (error) {
        console.error('Error triggering update:', error);
        res.status(500).json({ error: 'Failed to trigger update', details: error.message });
    }
});

// ---------------------------------------------------------
// File Management Endpoints
// ---------------------------------------------------------

// Upload file to specific server directory
app.post('/servers/:id/files/upload', upload.single('file'), async (req, res) => {
    try {
        const { id } = req.params;
        const targetPath = req.query.path || ''; // Relative path inside server root
        const file = req.file;
        
        if (!file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const container = docker.getContainer(id);
        const containerInfo = await container.inspect();
        const serverName = containerInfo.Name.replace('/hytale-', '');
        
        const targetDir = path.join(BASE_CASAOS_DIR, serverName, targetPath);
        
        // Make sure target directory exists
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        
        const finalPath = path.join(targetDir, file.originalname);
        fs.renameSync(file.path, finalPath);
        
        res.json({ message: 'File uploaded successfully', path: finalPath });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ error: 'Failed to upload file', details: error.message });
    }
});

// Read/List files for server
app.get('/servers/:id/files', async (req, res) => {
    try {
        const { id } = req.params;
        const targetPath = req.query.path || ''; // Relative path inside server root
        
        const container = docker.getContainer(id);
        const containerInfo = await container.inspect();
        const serverName = containerInfo.Name.replace('/hytale-', '');
        
        const dirPath = path.join(BASE_CASAOS_DIR, serverName, targetPath);
        
        if (!fs.existsSync(dirPath)) {
            return res.status(404).json({ error: 'Directory not found' });
        }
        
        const files = fs.readdirSync(dirPath).map(file => {
            const fullPath = path.join(dirPath, file);
            const stats = fs.statSync(fullPath);
            return {
                name: file,
                isDirectory: stats.isDirectory(),
                size: stats.size,
                mtime: stats.mtime
            };
        });
        
        res.json({ files });
    } catch (error) {
        console.error('Error reading files:', error);
        res.status(500).json({ error: 'Failed to read files', details: error.message });
    }
});

// Delete file
app.delete('/servers/:id/files', async (req, res) => {
    try {
        const { id } = req.params;
        const targetPath = req.query.path;
        
        if (!targetPath) {
            return res.status(400).json({ error: 'Path is required' });
        }

        const container = docker.getContainer(id);
        const containerInfo = await container.inspect();
        const serverName = containerInfo.Name.replace('/hytale-', '');
        
        const fullPath = path.join(BASE_CASAOS_DIR, serverName, targetPath);
        
        // Basic security to avoid deleting outside of BASE_CASAOS_DIR
        if (!fullPath.startsWith(BASE_CASAOS_DIR)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        if (fs.existsSync(fullPath)) {
            const stats = fs.statSync(fullPath);
            if (stats.isDirectory()) {
                fs.rmSync(fullPath, { recursive: true, force: true });
            } else {
                fs.unlinkSync(fullPath);
            }
            res.json({ message: 'File/Directory deleted' });
        } else {
            res.status(404).json({ error: 'File not found' });
        }
    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ error: 'Failed to delete file', details: error.message });
    }
});

app.listen(port, () => {
    console.log(`Hytale Server Manager API listening on port ${port}`);
});
