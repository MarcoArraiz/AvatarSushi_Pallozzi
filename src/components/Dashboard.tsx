import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { ChevronLeft, ChevronRight, Users, Settings, MapPin, Plus, Calendar, CheckCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import ShiftPanel from './ShiftPanel';
import PersonnelManagement from './PersonnelManagement';
import ShiftDetails from './ShiftDetails';
import LocationsManagement from './LocationsManagement';
import LocationDetails from './LocationDetails';

interface DashboardProps {
  user: User;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'supervisor' | 'garzon';
}

interface Shift {
  id: string;
  date: string;
  type: 'apertura' | 'cierre';
  area: string;
  assigned_users: string[];
  created_at: string;
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPersonnel, setShowPersonnel] = useState(false);
  const [showLocations, setShowLocations] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<any>(null);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [viewingLocationShift, setViewingLocationShift] = useState(false);
  const [locationContext, setLocationContext] = useState<any>(null);
  const [locations, setLocations] = useState<any[]>([]);
  const [locationStats, setLocationStats] = useState<Record<string, any>>({});

  useEffect(() => {
    loadUserProfile();
  }, [user]);

  useEffect(() => {
    if (userProfile?.role === 'supervisor') {
      loadLocations();
    }
  }, [userProfile]);

  useEffect(() => {
    if (userProfile && userProfile.role === 'garzon') {
      loadShiftsForDate();
    }
  }, [currentDate, userProfile]);

  const loadUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;
      setUserProfile(data);
    } catch (error) {
      console.error('Error loading user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadShiftsForDate = async () => {
    const dateString = currentDate.toISOString().split('T')[0];
    
    try {
      let query = supabase
        .from('shifts')
        .select('*')
        .eq('date', dateString);

      // If user is garzon, only show shifts they're assigned to
      if (userProfile?.role === 'garzon') {
        query = query.contains('assigned_users', [user.id]);
      }

      const { data, error } = await query.order('type');
      
      if (error) throw error;
      setShifts(data || []);
    } catch (error) {
      console.error('Error loading shifts:', error);
    }
  };

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
    }
  };

  const loadLocationStats = async (locations: any[]) => {
    const stats: Record<string, any> = {};
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

  const changeDate = (days: number) => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + days);
    setCurrentDate(newDate);
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-CL', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">Error: No se pudo cargar el perfil de usuario.</p>
      </div>
    );
  }

  if (selectedLocation) {
    return (
      <LocationDetails
        location={selectedLocation}
        onBack={() => setSelectedLocation(null)}
        onViewShift={(shift) => {
          setSelectedShift(shift);
          setViewingLocationShift(true);
          setLocationContext(selectedLocation);
        }}
      />
    );
  }

  if (showLocations && userProfile.role === 'supervisor') {
    return (
      <LocationsManagement
        onBack={() => setShowLocations(false)}
        onViewLocation={(location) => setSelectedLocation(location)}
      />
    );
  }

  if (selectedShift) {
    return (
      <ShiftDetails
        shift={selectedShift}
        user={user}
        userProfile={userProfile}
        locationContext={locationContext}
        onBack={() => {
          setSelectedShift(null);
          setLocationContext(null);
          if (viewingLocationShift) {
            setViewingLocationShift(false);
            // Don't reload shifts for main dashboard when coming from location view
          } else {
            loadShiftsForDate();
          }
        }}
        onUpdate={() => {
          if (!viewingLocationShift) {
            loadShiftsForDate();
          }
        }}
      />
    );
  }

  if (showPersonnel && userProfile.role === 'supervisor') {
    return (
      <PersonnelManagement
        onBack={() => setShowPersonnel(false)}
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with user info and actions */}
      <div className="bg-white rounded-xl shadow-md p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Bienvenido, {userProfile.full_name}
            </h2>
            <p className="text-gray-600 capitalize">
              Rol: {userProfile.role === 'supervisor' ? 'Supervisor' : 'Garzón'}
            </p>
          </div>
          {userProfile.role === 'supervisor' && (
            <div className="flex space-x-3">
              <button
                onClick={() => setShowPersonnel(true)}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span>Añadir Locales</span>
              </button>
              <button
                onClick={() => setShowPersonnel(true)}
                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Users className="w-4 h-4" />
                <span>Gestionar Personal</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Date Navigation - Only for Garzones */}
      {userProfile.role === 'garzon' && (
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex justify-between items-center">
            <button
              onClick={() => changeDate(-1)}
              className="p-3 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold text-gray-800 capitalize">
              {formatDate(currentDate)}
            </h3>
            <button
              onClick={() => changeDate(1)}
              className="p-3 rounded-full hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Content based on role */}
      {userProfile.role === 'supervisor' ? (
        /* Locations Grid for Supervisors */
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
                      <CheckCircle className="w-4 h-4" />
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
                  <MapPin className="w-4 h-4" />
                  <span>Ver Detalles</span>
                </button>
              </div>
            );
          })}

          {locations.length === 0 && (
            <div className="col-span-full text-center py-12">
              <MapPin className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-500">No hay locales registrados</p>
            </div>
          )}
        </div>
      ) : (
        /* Shifts Grid for Garzones */
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {shifts.map((shift) => (
              <ShiftPanel
                key={shift.id}
                shift={shift}
                userProfile={userProfile}
                onAssignTeam={loadShiftsForDate}
                onViewDetails={() => setSelectedShift(shift)}
              />
            ))}
          </div>

          {shifts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">No hay turnos disponibles para esta fecha.</p>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Dashboard;