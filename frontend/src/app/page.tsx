"use client";

import { useEffect, useState, useRef } from "react";
import { Server, Power, Play, Square, RotateCcw, RefreshCw, FolderOpen, Terminal, X, Upload } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4983";

export default function Home() {
  const [servers, setServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modManagerServer, setModManagerServer] = useState<any | null>(null);

  const fetchServers = async () => {
    try {
      const res = await fetch(`${API_URL}/servers`);
      const data = await res.json();
      setServers(data.servers || []);
    } catch (err) {
      console.error("Failed to fetch servers", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServers();
    const interval = setInterval(fetchServers, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAction = async (id: string, action: string) => {
    try {
      if (action === "update") {
        await fetch(`${API_URL}/servers/${id}/update`, { method: "POST" });
      } else {
        await fetch(`${API_URL}/servers/${id}/power`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
      }
      fetchServers();
    } catch (err) {
      console.error(`Failed to ${action} server`, err);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 p-8">
      <header className="flex items-center gap-4 mb-8 pb-4 border-b border-zinc-800">
        <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Server className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
          Hytale Server Manager
        </h1>
      </header>

      <main className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">Active Instances</h2>
          <button onClick={fetchServers} className="p-2.5 bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 rounded-lg transition-all flex items-center gap-2 text-sm font-medium hover:border-zinc-700 active:scale-95">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> 
            Refresh
          </button>
        </div>

        {loading && servers.length === 0 ? (
          <div className="flex justify-center items-center py-32">
            <RefreshCw className="w-8 h-8 animate-spin text-zinc-600" />
          </div>
        ) : servers.length === 0 ? (
          <div className="text-center py-20 px-4 bg-zinc-900/30 rounded-2xl border border-zinc-800/50">
            <div className="w-16 h-16 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <Server className="w-8 h-8 text-zinc-500" />
            </div>
            <h3 className="text-xl font-medium text-zinc-200">No instances found</h3>
            <p className="text-zinc-500 mt-2 max-w-sm mx-auto">
              It looks like there are no Hytale servers running on your Docker host. Create one to get started.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {servers.map((server) => (
              <ServerCard 
                key={server.id} 
                server={server} 
                onAction={handleAction} 
                onOpenMods={() => setModManagerServer(server)} 
              />
            ))}
          </div>
        )}
      </main>

      {modManagerServer && (
        <ModManagerModal server={modManagerServer} onClose={() => setModManagerServer(null)} />
      )}
    </div>
  );
}

function ServerCard({ server, onAction, onOpenMods }: { server: any; onAction: (id: string, action: string) => void; onOpenMods: () => void }) {
  const isRunning = server.state === "running";

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 transition-all hover:border-zinc-700 shadow-xl overflow-hidden relative group">
      <div className={`absolute top-0 left-0 w-full h-1 ${isRunning ? "bg-emerald-500" : "bg-zinc-700"}`}></div>
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-zinc-800/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div>
          <h3 className="font-bold text-xl mb-2 text-zinc-100 placeholder-zinc-700">{server.name}</h3>
          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${isRunning ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-zinc-800 text-zinc-400 border border-zinc-700"}`}>
            <span className={`w-2 h-2 rounded-full ${isRunning ? "bg-emerald-500 animate-pulse" : "bg-zinc-500"}`}></span>
            {server.state.toUpperCase()}
          </span>
        </div>
        <div className="flex gap-2 bg-zinc-950 p-1 rounded-xl border border-zinc-800 shadow-inner">
          {isRunning ? (
            <button onClick={() => onAction(server.id, "stop")} className="p-2 hover:bg-rose-500/20 text-rose-400 rounded-lg transition-colors" title="Stop Server">
              <Square className="w-4 h-4 fill-current" />
            </button>
          ) : (
            <button onClick={() => onAction(server.id, "start")} className="p-2 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors" title="Start Server">
              <Play className="w-4 h-4 fill-current" />
            </button>
          )}
          <button onClick={() => onAction(server.id, "restart")} className="p-2 hover:bg-zinc-800 text-zinc-300 rounded-lg transition-colors" title="Restart Server">
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="space-y-3 mb-8 relative z-10 p-4 bg-zinc-950/50 rounded-xl border border-zinc-800/50">
        <div className="flex justify-between items-center text-sm py-1 border-b border-zinc-800/50">
          <span className="text-zinc-500 font-medium">Container ID</span>
          <span className="text-zinc-300 font-mono text-xs bg-zinc-900 px-2 py-1 rounded-md">{server.id.substring(0, 12)}</span>
        </div>
        <div className="flex justify-between items-center text-sm py-1">
          <span className="text-zinc-500 font-medium">Ports</span>
          <span className="text-zinc-300 text-xs font-mono">
            {server.ports?.map((p: any) => `${p.PublicPort || p.PrivatePort}`).join(", ") || "None"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 relative z-10">
        <button onClick={onOpenMods} className="flex items-center justify-center gap-2 p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-semibold text-zinc-200 transition-all hover:-translate-y-0.5">
          <FolderOpen className="w-4 h-4 text-blue-400" />
          Mod Manager
        </button>
        <button onClick={() => onAction(server.id, "update")} className="flex items-center justify-center gap-2 p-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-sm font-semibold text-zinc-200 transition-all hover:-translate-y-0.5">
          <RefreshCw className="w-4 h-4 text-amber-400" />
          Update
        </button>
      </div>
    </div>
  );
}

function ModManagerModal({ server, onClose }: { server: any; onClose: () => void }) {
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchFiles = async () => {
    try {
      const res = await fetch(`${API_URL}/servers/${server.id}/files?path=mods`);
      if (res.ok) {
        const data = await res.json();
        setFiles(data.files || []);
      } else {
        setFiles([]);
      }
    } catch (err) {
      console.error("Failed to fetch files", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);

    try {
      await fetch(`${API_URL}/servers/${server.id}/files/upload?path=mods`, {
        method: "POST",
        body: formData,
      });
      await fetchFiles();
    } catch (err) {
      console.error("Failed to upload file", err);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const handleDelete = async (filename: string) => {
    if (!confirm(`Are you sure you want to delete ${filename}?`)) return;
    
    try {
      await fetch(`${API_URL}/servers/${server.id}/files?path=mods/${filename}`, {
        method: "DELETE",
      });
      await fetchFiles();
    } catch (err) {
      console.error("Failed to delete file", err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-900">
          <div>
            <h2 className="text-xl font-bold text-zinc-100 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-blue-400" /> 
              Mod Manager
            </h2>
            <p className="text-zinc-500 text-sm mt-1">Managing mods for {server.name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-800 rounded-full transition-colors text-zinc-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <RefreshCw className="w-6 h-6 animate-spin text-zinc-600" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-16 px-4 bg-zinc-950 rounded-xl border border-dashed border-zinc-800">
              <FolderOpen className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
              <h3 className="text-zinc-300 font-medium mb-1">No mods found</h3>
              <p className="text-zinc-600 text-sm">Upload .jar or .hymod files to see them here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {files.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-4 bg-zinc-950 border border-zinc-800 rounded-xl hover:border-zinc-700 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                      <FolderOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-medium text-zinc-200 text-sm">{file.name}</p>
                      <p className="text-xs text-zinc-600 mt-0.5">{(file.size / 1024).toFixed(1)} KB • {new Date(file.mtime).toLocaleDateString()}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(file.name)}
                    className="p-2 text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-zinc-800 bg-zinc-900/50">
          <label className={`flex justify-center w-full h-32 px-4 transition bg-zinc-950 border-2 border-zinc-800 border-dashed rounded-xl appearance-none cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            <span className="flex items-center space-x-2">
              {uploading ? (
                <RefreshCw className="w-6 h-6 animate-spin text-blue-400" />
              ) : (
                <Upload className="w-6 h-6 text-zinc-400" />
              )}
              <span className="font-medium text-zinc-300">
                {uploading ? 'Uploading...' : 'Drop files to attach, or browse'}
              </span>
            </span>
            <input ref={fileInputRef} type="file" name="file_upload" className="hidden" onChange={handleFileUpload} accept=".jar,.hymod,.zip" />
          </label>
        </div>
      </div>
    </div>
  );
}
