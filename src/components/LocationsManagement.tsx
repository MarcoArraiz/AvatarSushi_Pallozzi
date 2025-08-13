import React, { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Users, Calendar, Eye, Plus, Edit2, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LocationsManagementProps {
  onBack: () => void;
}

interface Location {
  id: string;
  name: string;
  address: string;
  created_at: string;
}

interface LocationStats {
  totalShifts: number;
  activeShifts: number;
  assignedWorkers: number;
}

const LocationsManagement: React.FC<LocationsManagementProps> = ({ onBack }) => {
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationStats, setLocationStats] = useState<Record<string, LocationStats>>({});
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', address: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadLocations();
  }, []);

  const loadLocations = async () => {
    try {
      const { data, error } = await supabase
        .from('locations')
        .select('*')
        .order('name');

      if (error) throw error;
      setLocations(data || []);
      
      // Load stats for each location
      await loadLocationStats(data || []);
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadLocationStats = async (locations: Location[]) => {
    const stats: Record<string, LocationStats> = {};
    const today = new Date().toISOString().split('T')[0];

    for (const location of locations) {
      try {
        // Get shifts for today
        const { data: shifts } = await supabase
          .from('shifts')
          .select('id, assigned_users')
          .eq('location_id', location.id)
          .eq('date', today);

        const totalShifts = shifts?.length || 0;
        const activeShifts = shifts?.filter(s => s.assigned_users.length > 0).length || 0;
        
        // Count unique assigned workers
        const allAssignedUsers = new Set();
        shifts?.forEach(shift => {
          shift.assigned_users.forEach((userId: string) => allAssignedUsers.add(userId));
        });

        stats[location.id] = {
          totalShifts,
          activeShifts,
          assignedWorkers: allAssignedUsers.size
        };
      } catch (error) {
        console.error(`Error loading stats for location ${location.id}:`, error);
        stats[location.id] = { totalShifts: 0, activeShifts: 0, assignedWorkers: 0 };
      }
    }

    setLocationStats(stats);
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const { error } = await supabase
        .from('locations')
        .insert({
          name: formData.name,
          address: formData.address
        });

      if (error) throw error;

      setFormData({ name: '', address: '' });
      setShowAddForm(false);
      loadLocations();
    } catch (error) {
      console.error('Error adding location:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLocation = async (locationId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este local?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('locations')
        .delete()
        .eq('id', locationId);

      if (error) throw error;
      loadLocations();
    } catch (error) {
      console.error('Error deleting location:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Gestión de Locales</h2>
              <p className="text-gray-600">Administra los locales comerciales</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Local</span>
          </button>
        </div>
      </div>

      {/* Add Location Form */}
      {showAddForm && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Nuevo Local</h3>
          
          <form onSubmit={handleAddLocation} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Local
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Avatar Sushi - Providencia"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Dirección
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Providencia, Santiago"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddForm(false);
                  setFormData({ name: '', address: '' });
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {saving ? 'Guardando...' : 'Crear Local'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Locations Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {locations.map((location) => {
          const stats = locationStats[location.id] || { totalShifts: 0, activeShifts: 0, assignedWorkers: 0 };
          
          return (
            <div key={location.id} className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">{location.name}</h3>
                    <p className="text-sm text-gray-600">{location.address}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDeleteLocation(location.id)}
                  className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-1 text-blue-600 mb-1">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <p className="text-2xl font-bold text-gray-800">{stats.totalShifts}</p>
                  <p className="text-xs text-gray-500">Turnos Hoy</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-1 text-green-600 mb-1">
                    <Eye className="w-4 h-4" />
                  </div>
                  <p className="text-2xl font-bold text-gray-800">{stats.activeShifts}</p>
                  <p className="text-xs text-gray-500">Activos</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-1 text-purple-600 mb-1">
                    <Users className="w-4 h-4" />
                  </div>
                  <p className="text-2xl font-bold text-gray-800">{stats.assignedWorkers}</p>
                  <p className="text-xs text-gray-500">Trabajadores</p>
                </div>
              </div>

              {/* Actions */}
              <button
                onClick={() => setSelectedLocation(location)}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
              >
                <Eye className="w-4 h-4" />
                <span>Ver Detalles</span>
              </button>
            </div>
          );
        })}
      </div>

      {locations.length === 0 && (
        <div className="text-center py-12">
          <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No hay locales registrados</p>
        </div>
      )}
    </div>
  );
};

export default LocationsManagement;