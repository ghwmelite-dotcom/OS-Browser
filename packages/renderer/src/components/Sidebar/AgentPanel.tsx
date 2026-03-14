import React, { useEffect, useState } from 'react';
import { Bot, Plus, Trash2, Play, X } from 'lucide-react';

interface Agent {
  id: number; name: string; description: string; system_prompt: string; model: string; is_active: boolean;
}

export function AgentPanel() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [newAgent, setNewAgent] = useState({ name: '', description: '', system_prompt: '', model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast' });
  const [executingId, setExecutingId] = useState<number | null>(null);
  const [executeInput, setExecuteInput] = useState('');
  const [executeResult, setExecuteResult] = useState('');

  useEffect(() => { loadAgents(); }, []);

  const loadAgents = async () => {
    const list = await window.osBrowser.agents.list();
    setAgents(list);
  };

  const handleCreate = async () => {
    if (!newAgent.name.trim() || !newAgent.system_prompt.trim()) return;
    await window.osBrowser.agents.create(newAgent);
    setNewAgent({ name: '', description: '', system_prompt: '', model: '@cf/meta/llama-3.3-70b-instruct-fp8-fast' });
    setShowCreate(false);
    loadAgents();
  };

  const handleDelete = async (id: number) => {
    await window.osBrowser.agents.delete(id);
    loadAgents();
  };

  const handleExecute = async (id: number) => {
    if (!executeInput.trim()) return;
    setExecuteResult('Thinking...');
    try {
      const result = await window.osBrowser.agents.execute(id, executeInput);
      setExecuteResult(result?.content || JSON.stringify(result));
    } catch (err: any) {
      setExecuteResult(`Error: ${err.message}`);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2"><Bot size={16} className="text-ghana-gold" /><span className="text-sm font-medium">Custom Agents</span></div>
        <button onClick={() => setShowCreate(!showCreate)} className="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-2 focus:outline-none focus:ring-2 focus:ring-ghana-gold">
          {showCreate ? <X size={14} className="text-text-muted" /> : <Plus size={14} className="text-text-muted" />}
        </button>
      </div>

      {showCreate && (
        <div className="space-y-2 p-3 bg-surface-2 rounded-card">
          <input type="text" placeholder="Agent name" value={newAgent.name} onChange={e => setNewAgent({...newAgent, name: e.target.value})} className="w-full px-3 py-1.5 bg-surface-3 rounded-btn text-sm text-text-primary outline-none focus:ring-2 focus:ring-ghana-gold" />
          <input type="text" placeholder="Description" value={newAgent.description} onChange={e => setNewAgent({...newAgent, description: e.target.value})} className="w-full px-3 py-1.5 bg-surface-3 rounded-btn text-sm text-text-primary outline-none focus:ring-2 focus:ring-ghana-gold" />
          <textarea placeholder="System prompt..." value={newAgent.system_prompt} onChange={e => setNewAgent({...newAgent, system_prompt: e.target.value})} rows={3} className="w-full px-3 py-1.5 bg-surface-3 rounded-btn text-sm text-text-primary outline-none focus:ring-2 focus:ring-ghana-gold resize-none" />
          <button onClick={handleCreate} className="w-full py-1.5 bg-ghana-gold text-bg text-sm rounded-btn hover:brightness-110">Create Agent</button>
        </div>
      )}

      {agents.map(agent => (
        <div key={agent.id} className="p-3 bg-surface-2 rounded-card space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-text-primary">{agent.name}</span>
            <div className="flex items-center gap-1">
              <button onClick={() => setExecutingId(executingId === agent.id ? null : agent.id)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-surface-3"><Play size={12} className="text-ghana-gold" /></button>
              <button onClick={() => handleDelete(agent.id)} className="w-6 h-6 flex items-center justify-center rounded hover:bg-ghana-red/20"><Trash2 size={12} className="text-ghana-red" /></button>
            </div>
          </div>
          <p className="text-xs text-text-muted">{agent.description}</p>
          {executingId === agent.id && (
            <div className="space-y-2">
              <textarea placeholder="Ask this agent..." value={executeInput} onChange={e => setExecuteInput(e.target.value)} rows={2} className="w-full px-3 py-1.5 bg-surface-3 rounded-btn text-sm text-text-primary outline-none focus:ring-2 focus:ring-ghana-gold resize-none" />
              <button onClick={() => handleExecute(agent.id)} className="w-full py-1.5 bg-ghana-gold/20 text-ghana-gold text-xs rounded-btn hover:bg-ghana-gold/30">Run Agent</button>
              {executeResult && <div className="text-xs text-text-secondary bg-surface-3 rounded-btn p-2 max-h-32 overflow-y-auto">{executeResult}</div>}
            </div>
          )}
        </div>
      ))}

      {agents.length === 0 && !showCreate && (
        <p className="text-sm text-text-muted text-center py-4">No custom agents yet. Create one to get started.</p>
      )}
    </div>
  );
}
