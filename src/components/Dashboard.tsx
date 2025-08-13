import React, { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { ChevronLeft, ChevronRight, Users, Settings, MapPin } from 'lucide-react';
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

  useEffect(() => {
    loadUserProfile();
  }, [user]);

  useEffect(() => {
    if (userProfile) {
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
      // Ensure shifts exist for the current date
      await ensureShiftsExist(dateString);
      
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

  const ensureShiftsExist = async (dateString: string) => {
    const shiftTypes = ['apertura', 'cierre'];
    
    for (const type of shiftTypes) {
      const { data: existingShift } = await supabase
        .from('shifts')
        .select('id')
        .eq('date', dateString)
        .eq('type', type)
        .eq('area', 'salon')
        .maybeSingle();

      if (!existingShift) {
        await supabase
          .from('shifts')
          .insert({
            date: dateString,
            type,
            area: 'salon',
            assigned_users: []
          });
      }
    }
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
        onBack={() => {
          setSelectedShift(null);
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
                onClick={() => setShowLocations(true)}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <MapPin className="w-4 h-4" />
                <span>Gestionar Locales</span>
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

      {/* Date Navigation */}
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

      {/* Shifts Grid */}
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
    </div>
  );
};

export default Dashboard;