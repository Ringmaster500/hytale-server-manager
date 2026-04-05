"use client";

import { useEffect, useState, useRef } from "react";
import { Server, Power, Play, Square, RotateCcw, RefreshCw, FolderOpen, Terminal, X, Upload, Plus, Cpu, HardDrive, Settings, Activity } from "lucide-react";

const API_URL = "/api";

export default function Home() {
  const [servers, setServers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modManagerServer, setModManagerServer] = useState<any | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

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

  const handleCreateServer = async (name: string, port: number) => {
    try {
      const res = await fetch(`${API_URL}/servers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, port }),
      });
      if (res.ok) {
        setCreateModalOpen(false);
        fetchServers();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to create server");
      }
    } catch (err) {
      console.error("Failed to create server", err);
    }
  };

  const handleDeleteServer = async (id: string) => {
    if (!confirm("Are you sure you want to delete this server? All data will be lost.")) return;
    
    try {
      const res = await fetch(`${API_URL}/servers/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        fetchServers();
      }
    } catch (err) {
      console.error("Failed to delete server", err);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 relative overflow-hidden">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full pointer-events-none"></div>

      <div className="relative z-10 p-6 md:p-12">
        <header className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 animate-in slide-in-from-top duration-700">
          <div className="flex items-center gap-5">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/40 rotate-3 hover:rotate-0 transition-transform duration-300">
              <Server className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-black tracking-tight bg-gradient-to-br from-white via-zinc-200 to-zinc-500 bg-clip-text text-transparent">
                Hytale Manager
              </h1>
              <p className="text-zinc-500 text-sm font-medium mt-1">v1.2.0 • System Online</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={fetchServers} 
              className="p-3 bg-zinc-900/50 backdrop-blur-md border border-zinc-800 hover:bg-zinc-800/80 rounded-xl transition-all flex items-center gap-2 text-sm font-semibold hover:border-zinc-700 active:scale-95 group"
            >
              <RefreshCw className={`w-4 h-4 text-zinc-400 group-hover:text-blue-400 transition-colors ${loading ? 'animate-spin' : ''}`} /> 
            </button>
            <button 
              onClick={() => setCreateModalOpen(true)}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-all flex items-center gap-2 text-sm font-bold shadow-lg shadow-blue-600/20 active:scale-95 hover:-translate-y-0.5"
            >
              <Plus className="w-5 h-5" />
              New Instance
            </button>
          </div>
        </header>

        <main className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <Activity className="w-5 h-5 text-blue-500" />
            <h2 className="text-2xl font-bold text-zinc-100">Server Fleet</h2>
            <div className="h-px flex-1 bg-gradient-to-r from-zinc-800 to-transparent ml-4"></div>
          </div>

          {loading && servers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-40 animate-pulse">
              <div className="w-12 h-12 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-4"></div>
              <p className="text-zinc-500 font-medium">Scanning network...</p>
            </div>
          ) : servers.length === 0 ? (
            <div className="text-center py-32 px-4 bg-zinc-900/20 backdrop-blur-sm rounded-[2rem] border border-zinc-800/50 shadow-2xl animate-in zoom-in-95 duration-500">
              <div className="w-24 h-24 bg-gradient-to-br from-zinc-800 to-zinc-900 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl rotate-6 group-hover:rotate-0 transition-transform">
                <Server className="w-12 h-12 text-zinc-600" />
              </div>
              <h3 className="text-3xl font-bold text-zinc-200 mb-3">No active instances</h3>
              <p className="text-zinc-500 mb-10 max-w-md mx-auto text-lg leading-relaxed">
                Connect your Hytale universe. Launch your first server instance with full mod support and automatic updates.
              </p>
              <button 
                onClick={() => setCreateModalOpen(true)}
                className="px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl transition-all inline-flex items-center gap-3 text-lg font-bold shadow-xl shadow-blue-600/30 active:scale-95"
              >
                <Plus className="w-6 h-6" />
                Initialize First Server
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-1000">
              {servers.map((server) => (
                <ServerCard 
                  key={server.id} 
                  server={server} 
                  onAction={handleAction} 
                  onOpenMods={() => setModManagerServer(server)} 
                  onDelete={() => handleDeleteServer(server.id)}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {createModalOpen && (
        <CreateServerModal 
          onClose={() => setCreateModalOpen(false)} 
          onCreate={handleCreateServer} 
        />
      )}

      {modManagerServer && (
        <ModManagerModal server={modManagerServer} onClose={() => setModManagerServer(null)} />
      )}
    </div>
  );
}

function ServerCard({ server, onAction, onOpenMods, onDelete }: { server: any; onAction: (id: string, action: string) => void; onOpenMods: () => void; onDelete: () => void }) {
  const isRunning = server.state === "running";

  return (
    <div className="group bg-zinc-900/40 backdrop-blur-xl border border-zinc-800/80 rounded-3xl overflow-hidden shadow-2xl transition-all duration-300 hover:border-blue-500/30 hover:bg-zinc-900/60 flex flex-col">
      {/* Dynamic Status Header */}
      <div className={`h-1.5 w-full transition-colors duration-500 ${isRunning ? "bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.4)]" : "bg-zinc-700"}`}></div>
      
      <div className="p-7 flex flex-col flex-1">
        <div className="flex justify-between items-start mb-6">
          <div>
            <h3 className="font-black text-2xl text-zinc-100 group-hover:text-white transition-colors truncate max-w-[200px]">{server.name}</h3>
            <div className="flex items-center gap-2 mt-2">
              <span className={`inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest font-black px-2.5 py-1 rounded-lg ${isRunning ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-zinc-800/80 text-zinc-400 border border-zinc-700"}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isRunning ? "bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" : "bg-zinc-500"}`}></span>
                {server.state}
              </span>
              <span className="text-[10px] text-zinc-600 font-mono tracking-tighter">{server.id.substring(0, 8)}</span>
            </div>
          </div>
          
          <div className="flex gap-1.5 p-1.5 bg-zinc-950/80 rounded-2xl border border-zinc-800/50 shadow-inner">
            {isRunning ? (
              <button onClick={() => onAction(server.id, "stop")} className="p-2.5 hover:bg-rose-500/20 text-rose-400 rounded-xl transition-all hover:scale-110" title="Stop">
                <Square className="w-4 h-4 fill-current" />
              </button>
            ) : (
              <button onClick={() => onAction(server.id, "start")} className="p-2.5 hover:bg-emerald-500/20 text-emerald-400 rounded-xl transition-all hover:scale-110" title="Start">
                <Play className="w-4 h-4 fill-current" />
              </button>
            )}
            <button onClick={() => onAction(server.id, "restart")} className="p-2.5 hover:bg-blue-500/20 text-blue-400 rounded-xl transition-all hover:scale-110" title="Restart">
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-8">
          <div className="p-4 bg-zinc-950/40 rounded-2xl border border-zinc-800/40 group-hover:border-zinc-800 transition-colors">
            <div className="flex items-center gap-2 mb-1 text-zinc-500">
              <Activity className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Port</span>
            </div>
            <p className="text-zinc-200 font-mono text-sm leading-none pt-1">
              {server.ports?.map((p: any) => `${p.PublicPort || p.PrivatePort}`).join(", ") || "Auto"}
            </p>
          </div>
          <div className="p-4 bg-zinc-950/40 rounded-2xl border border-zinc-800/40 group-hover:border-zinc-800 transition-colors">
            <div className="flex items-center gap-2 mb-1 text-zinc-500">
              <Settings className="w-3.5 h-3.5" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Storage</span>
            </div>
            <p className="text-zinc-200 font-mono text-sm leading-none pt-1">Mapped</p>
          </div>
        </div>

        <div className="mt-auto space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button onClick={onOpenMods} className="flex items-center justify-center gap-2 py-3 bg-zinc-800/50 hover:bg-blue-600 text-zinc-300 hover:text-white border border-zinc-800 hover:border-blue-500 rounded-2xl text-xs font-bold transition-all active:scale-95 group/btn">
              <FolderOpen className="w-4 h-4 text-blue-500 group-hover/btn:text-white transition-colors" />
              Files
            </button>
            <button onClick={() => onAction(server.id, "update")} className="flex items-center justify-center gap-2 py-3 bg-zinc-800/50 hover:bg-amber-600 text-zinc-300 hover:text-white border border-zinc-800 hover:border-amber-500 rounded-2xl text-xs font-bold transition-all active:scale-95 group/btn">
              <RefreshCw className="w-4 h-4 text-amber-500 group-hover/btn:text-white transition-colors" />
              Update
            </button>
          </div>
          <button 
            onClick={onDelete}
            className="w-full flex items-center justify-center gap-2 py-2.5 text-zinc-600 hover:text-rose-500 text-[10px] font-black uppercase tracking-tighter transition-colors group/del"
          >
            <X className="w-3 h-3 opacity-0 group-hover/del:opacity-100 transition-opacity" />
            Delete Instance
          </button>
        </div>
      </div>
    </div>
  );
}

function CreateServerModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, port: number) => void }) {
  const [name, setName] = useState("");
  const [port, setPort] = useState(25565);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] w-full max-w-md p-8 md:p-12 shadow-[0_0_100px_rgba(59,130,246,0.15)] relative overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-500">
        <div className="absolute top-0 right-0 p-6">
          <button onClick={onClose} className="p-3 hover:bg-zinc-800 rounded-2xl transition-colors text-zinc-500 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="mb-10 text-center">
          <div className="w-20 h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center mx-auto mb-6 text-blue-500 shadow-inner">
            <Plus className="w-10 h-10" />
          </div>
          <h2 className="text-3xl font-black text-zinc-100 mb-2">New Server</h2>
          <p className="text-zinc-500 text-sm font-medium">Configure your fresh Hytale instance</p>
        </div>

        <div className="space-y-8">
          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 ml-1">Server Identity</label>
            <input 
              type="text" 
              placeholder="e.g. survival-01" 
              value={name} 
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-zinc-950 border-2 border-zinc-800 rounded-2xl px-6 py-4 text-zinc-100 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 placeholder:text-zinc-700 transition-all font-bold"
            />
          </div>

          <div>
            <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3 ml-1">Network Port</label>
            <input 
              type="number" 
              value={port} 
              onChange={(e) => setPort(parseInt(e.target.value))}
              className="w-full bg-zinc-950 border-2 border-zinc-800 rounded-2xl px-6 py-4 text-zinc-100 focus:outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-600/10 transition-all font-mono font-bold text-lg"
            />
            <p className="text-[10px] text-zinc-600 mt-3 ml-1 font-medium italic">Standard port is 25565</p>
          </div>

          <button 
            disabled={!name}
            onClick={() => onCreate(name, port)}
            className="w-full py-5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-2xl transition-all flex items-center justify-center gap-3 text-lg font-black shadow-xl shadow-blue-600/20 active:scale-95 disabled:pointer-events-none"
          >
            Deploy Instance
          </button>
        </div>
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-12 duration-500">
        <div className="flex justify-between items-center p-10 border-b border-zinc-800 bg-zinc-900/50">
          <div>
            <h2 className="text-3xl font-black text-zinc-100 flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600/10 rounded-2xl flex items-center justify-center text-blue-500">
                <FolderOpen className="w-7 h-7" /> 
              </div>
              File Explorer
            </h2>
            <p className="text-zinc-500 text-sm font-semibold mt-2 ml-1">Managing {server.name}</p>
          </div>
          <button onClick={onClose} className="p-4 hover:bg-zinc-800 rounded-2xl transition-colors text-zinc-500 hover:text-white">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-24">
              <RefreshCw className="w-10 h-10 animate-spin text-blue-500/20" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-20 px-8 bg-zinc-950/50 rounded-3xl border-2 border-dashed border-zinc-800/50">
              <div className="w-20 h-20 bg-zinc-900 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                <FolderOpen className="w-10 h-10 text-zinc-700" />
              </div>
              <h3 className="text-xl font-bold text-zinc-400 mb-2">Workspace Empty</h3>
              <p className="text-zinc-600 text-sm font-medium">Upload .jar or .hymod files to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {files.map((file, idx) => (
                <div key={idx} className="flex items-center justify-between p-5 bg-zinc-950/80 border border-zinc-800/50 rounded-2xl hover:border-blue-500/30 transition-all group shadow-sm hover:shadow-blue-500/5">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-600 group-hover:text-blue-400 transition-colors">
                      <FolderOpen className="w-6 h-6" />
                    </div>
                    <div>
                      <p className="font-bold text-zinc-200 text-base mb-0.5">{file.name}</p>
                      <div className="flex items-center gap-3 text-xs text-zinc-600 font-bold uppercase tracking-wider">
                        <span>{(file.size / 1024).toFixed(1)} KB</span>
                        <span className="w-1 h-1 bg-zinc-800 rounded-full"></span>
                        <span>{new Date(file.mtime).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    onClick={() => handleDelete(file.name)}
                    className="p-3 text-zinc-600 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-10 border-t border-zinc-800 bg-zinc-950/50">
          <label className={`flex flex-col items-center justify-center w-full h-44 px-4 transition bg-zinc-900/30 border-2 border-zinc-800/80 border-dashed rounded-[2rem] appearance-none cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 group/upload ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {uploading ? (
                <RefreshCw className="w-10 h-10 animate-spin text-blue-500 mb-4" />
              ) : (
                <div className="w-14 h-14 bg-zinc-800 rounded-2xl flex items-center justify-center mb-4 group-hover/upload:scale-110 transition-transform">
                  <Upload className="w-7 h-7 text-zinc-500 group-hover/upload:text-blue-500 transition-colors" />
                </div>
              )}
              <p className="mb-2 text-base font-black text-zinc-300">
                {uploading ? 'Transmitting Data...' : 'Drop archives here'}
              </p>
              <p className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                {uploading ? 'Please wait' : 'Browse local files'}
              </p>
            </div>
            <input ref={fileInputRef} type="file" name="file_upload" className="hidden" onChange={handleFileUpload} accept=".jar,.hymod,.zip" />
          </label>
        </div>
      </div>
    </div>
  );
}
