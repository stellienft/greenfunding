import { useState, useEffect } from 'react';
import { supabase, Asset } from '../../lib/supabase';
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export function AssetsManager() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<Asset>>({});
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const { refreshAssets } = useApp();

  useEffect(() => {
    loadAssets();
  }, []);

  const loadAssets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('assets')
        .select('*')
        .order('ordering');

      if (error) throw error;
      if (data) setAssets(data);
    } catch (error) {
      console.error('Error loading assets:', error);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = (asset: Asset) => {
    setEditing(asset.id);
    setEditForm(asset);
  };

  const startCreate = () => {
    setCreating(true);
    setEditForm({
      name: '',
      description: '',
      icon: 'Package',
      ordering: assets.length + 1,
      active: true,
      risk_adjustment: 1.0
    });
  };

  const handleSave = async () => {
    try {
      if (creating) {
        const { error } = await supabase.from('assets').insert(editForm);
        if (error) throw error;
      } else if (editing) {
        const { error } = await supabase
          .from('assets')
          .update(editForm)
          .eq('id', editing);
        if (error) throw error;
      }

      setEditing(null);
      setCreating(false);
      setEditForm({});

      // Refresh both local and global state
      await refreshAssets();
      await loadAssets();
    } catch (error: any) {
      alert('Error saving: ' + error.message);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this asset?')) return;

    try {
      const { error } = await supabase.from('assets').delete().eq('id', id);
      if (error) throw error;

      // Refresh both local and global state
      await refreshAssets();
      await loadAssets();
    } catch (error: any) {
      alert('Error deleting: ' + error.message);
    }
  };

  const cancelEdit = () => {
    setEditing(null);
    setCreating(false);
    setEditForm({});
  };

  if (loading) {
    return <div className="text-center py-12 text-gray-600">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-[#3A475B]">Assets Management</h2>
        <button
          onClick={startCreate}
          disabled={creating || editing !== null}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-[#34AC48] to-[#AFD235] text-white font-bold rounded-xl hover:shadow-xl transition-colors disabled:opacity-50"
        >
          <Plus className="w-4 h-4" />
          Add Asset
        </button>
      </div>

      <div className="space-y-4">
        {creating && (
          <div className="bg-gray-50 border-2 border-[#28AA48] rounded-lg p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-[#3A475B] mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#3A475B] mb-1">
                  Icon (Lucide React)
                </label>
                <input
                  type="text"
                  value={editForm.icon || ''}
                  onChange={e => setEditForm({ ...editForm, icon: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-[#3A475B] mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={editForm.description || ''}
                  onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#3A475B] mb-1">
                  Ordering
                </label>
                <input
                  type="number"
                  value={editForm.ordering || 0}
                  onChange={e => setEditForm({ ...editForm, ordering: Number(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#3A475B] mb-1">
                  Risk Adjustment
                </label>
                <input
                  type="number"
                  value={editForm.risk_adjustment || 1.0}
                  onChange={e => setEditForm({ ...editForm, risk_adjustment: Number(e.target.value) })}
                  step="0.1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editForm.active || false}
                  onChange={e => setEditForm({ ...editForm, active: e.target.checked })}
                  className="w-5 h-5 text-[#28AA48] rounded"
                />
                <label className="font-semibold text-[#3A475B]">Active</label>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-[#28AA48] text-white font-semibold rounded-lg hover:bg-[#094325] transition-colors"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button
                onClick={cancelEdit}
                className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-[#3A475B] font-semibold rounded-lg hover:bg-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        )}

        {assets.map(asset => (
          <div
            key={asset.id}
            className={`
              bg-white border rounded-lg p-4
              ${editing === asset.id ? 'border-[#28AA48] border-2' : 'border-gray-200'}
            `}
          >
            {editing === asset.id ? (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-semibold text-[#3A475B] mb-1">
                      Name
                    </label>
                    <input
                      type="text"
                      value={editForm.name || ''}
                      onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#3A475B] mb-1">
                      Icon
                    </label>
                    <input
                      type="text"
                      value={editForm.icon || ''}
                      onChange={e => setEditForm({ ...editForm, icon: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-semibold text-[#3A475B] mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={editForm.description || ''}
                      onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#3A475B] mb-1">
                      Ordering
                    </label>
                    <input
                      type="number"
                      value={editForm.ordering || 0}
                      onChange={e => setEditForm({ ...editForm, ordering: Number(e.target.value) })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-[#3A475B] mb-1">
                      Risk Adjustment
                    </label>
                    <input
                      type="number"
                      value={editForm.risk_adjustment || 1.0}
                      onChange={e => setEditForm({ ...editForm, risk_adjustment: Number(e.target.value) })}
                      step="0.1"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editForm.active || false}
                      onChange={e => setEditForm({ ...editForm, active: e.target.checked })}
                      className="w-5 h-5 text-[#28AA48] rounded"
                    />
                    <label className="font-semibold text-[#3A475B]">Active</label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="flex items-center gap-2 px-4 py-2 bg-[#28AA48] text-white font-semibold rounded-lg hover:bg-[#094325] transition-colors"
                  >
                    <Save className="w-4 h-4" />
                    Save
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="flex items-center gap-2 px-4 py-2 bg-gray-200 text-[#3A475B] font-semibold rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-[#3A475B]">{asset.name}</h3>
                    {!asset.active && (
                      <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{asset.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Order: {asset.ordering} | Icon: {asset.icon} | Risk: {asset.risk_adjustment}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(asset)}
                    disabled={editing !== null || creating}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(asset.id)}
                    disabled={editing !== null || creating}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
