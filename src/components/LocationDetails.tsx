import React, { useState, useEffect } from 'react';
import { ArrowLeft, MapPin, Users, Calendar, Clock, CheckCircle, AlertTriangle, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LocationDetailsProps {
  location: {
    id: string;
    name: string;
    address: string;
  };
  onBack: () => void;
  onViewShift: (shift: any) => void;
}

interface Shift {
  id: string;
  type: 'apertura' | 'cierre';
  date: string;
  assigned_users: string[];
  area: string;
}

interface Task {
  id: string;
  text: string;
  status: 'pending' | 'completed';
  completed_by: string | null;
  completed_at: string | null;
  shift_id: string;
}

interface UserProfile {
  id: string;
  full_name: string;
  email: string;
}

interface Incident {
  id: string;
  task_id: string;
  note: string;
  reported_by: string;
  reported_at: string;
}

const LocationDetails: React.FC<LocationDetailsProps> = ({ location, onBack, onViewShift }) => {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadLocationData();
  }, [location.id, selectedDate]);

  const loadLocationData = async () => {
    setLoading(true);
    try {
      // Load shifts for selected date
      const { data: shiftsData } = await supabase
        .from('shifts')
        .select('*')
        .eq('location_id', location.id)
        .eq('date', selectedDate)
        .order('type');

      // If no shifts exist for this location and date, create them
      if (!shiftsData || shiftsData.length === 0) {
        await createShiftsForLocation(location.id, selectedDate);
        // Reload after creating
        const { data: newShiftsData } = await supabase
          .from('shifts')
          .select('*')
          .eq('location_id', location.id)
          .eq('date', selectedDate)
          .order('type');
        setShifts(newShiftsData || []);
      } else {
        setShifts(shiftsData);
      }

      setShifts(shiftsData || []);

      // Load tasks for these shifts
      if (shiftsData && shiftsData.length > 0) {
        const shiftIds = shiftsData.map(s => s.id);
        
        const { data: tasksData } = await supabase
          .from('tasks')
          .select('*')
          .in('shift_id', shiftIds);

        setTasks(tasksData || []);

        // Load incidents for these tasks
        const taskIds = tasksData?.map(t => t.id) || [];
        if (taskIds.length > 0) {
          const { data: incidentsData } = await supabase
            .from('incidents')
            .select('*')
            .in('task_id', taskIds);

          setIncidents(incidentsData || []);
        }

        // Load user profiles for assigned users
        const allUserIds = new Set<string>();
        shiftsData.forEach(shift => {
          shift.assigned_users.forEach(userId => allUserIds.add(userId));
        });
        tasksData?.forEach(task => {
          if (task.completed_by) allUserIds.add(task.completed_by);
        });

        if (allUserIds.size > 0) {
          const { data: usersData } = await supabase
            .from('user_profiles')
            .select('id, full_name, email')
            .in('id', Array.from(allUserIds));

          setUsers(usersData || []);
        }
      }
    } catch (error) {
      console.error('Error loading location data:', error);
    } finally {
      setLoading(false);
    }
  };

  const createShiftsForLocation = async (locationId: string, date: string) => {
    const shiftTypes = ['apertura', 'cierre'];
    
    const shiftsToCreate = shiftTypes.map(type => ({
      location_id: locationId,
      date: date,
      type: type,
      area: 'salon',
      assigned_users: []
    }));

    await supabase
      .from('shifts')
      .upsert(shiftsToCreate, {
        onConflict: 'date,type,area,location_id',
        ignoreDuplicates: true
      });
  };
  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.full_name || 'Usuario desconocido';
  };

  const getShiftTasks = (shiftId: string) => {
    return tasks.filter(task => task.shift_id === shiftId);
  };

  const getTaskIncidents = (taskId: string) => {
    return incidents.filter(incident => incident.task_id === taskId);
  };

  const getShiftProgress = (shiftId: string) => {
    const shiftTasks = getShiftTasks(shiftId);
    if (shiftTasks.length === 0) return 0;
    const completedTasks = shiftTasks.filter(task => task.status === 'completed').length;
    return Math.round((completedTasks / shiftTasks.length) * 100);
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <button
              onClick={onBack}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center space-x-3">
              <div className="bg-blue-100 text-blue-600 p-2 rounded-lg">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-800">{location.name}</h2>
                <p className="text-gray-600">{location.address}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Date Selector */}
        <div className="flex items-center space-x-4">
          <label className="text-sm font-medium text-gray-700">Fecha:</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Shifts Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {shifts.map((shift) => {
          const progress = getShiftProgress(shift.id);
          const shiftTasks = getShiftTasks(shift.id);
          const completedTasks = shiftTasks.filter(t => t.status === 'completed').length;
          const pendingTasks = shiftTasks.length - completedTasks;
          const shiftIncidents = shiftTasks.flatMap(task => getTaskIncidents(task.id));

          return (
            <div key={shift.id} className="bg-white rounded-xl shadow-md p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-lg ${
                    shift.type === 'apertura' ? 'bg-yellow-100 text-yellow-600' : 'bg-indigo-100 text-indigo-600'
                  }`}>
                    {shift.type === 'apertura' ? <Calendar className="w-5 h-5" /> : <Clock className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 capitalize">
                      Turno de {shift.type}
                    </h3>
                    <p className="text-sm text-gray-600">Área: {shift.area}</p>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Progreso</span>
                  <span className="text-sm font-bold text-gray-800">{progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 mb-4">
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-1 text-green-600 mb-1">
                    <CheckCircle className="w-4 h-4" />
                  </div>
                  <p className="text-lg font-bold text-gray-800">{completedTasks}</p>
                  <p className="text-xs text-gray-500">Completadas</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-1 text-orange-600 mb-1">
                    <Clock className="w-4 h-4" />
                  </div>
                  <p className="text-lg font-bold text-gray-800">{pendingTasks}</p>
                  <p className="text-xs text-gray-500">Pendientes</p>
                </div>
                <div className="text-center">
                  <div className="flex items-center justify-center space-x-1 text-red-600 mb-1">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <p className="text-lg font-bold text-gray-800">{shiftIncidents.length}</p>
                  <p className="text-xs text-gray-500">Incidencias</p>
                </div>
              </div>

              {/* View Shift Button */}
              <button
                onClick={() => {
                  console.log('Clicking shift:', shift);
                  onViewShift(shift);
                }}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 mb-4"
              >
                <Eye className="w-4 h-4" />
                <span>Ver Turno Detallado</span>
              </button>

              {/* Assigned Team */}
              {shift.assigned_users.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Equipo Asignado:</p>
                  <div className="flex flex-wrap gap-2">
                    {shift.assigned_users.map((userId) => (
                      <div
                        key={userId}
                        className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium"
                      >
                        {getUserName(userId)}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {shift.assigned_users.length === 0 && (
                <div className="text-center py-4">
                  <Users className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-500 text-sm">Sin equipo asignado</p>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {shifts.length === 0 && (
        <div className="text-center py-12">
          <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500">No hay turnos para esta fecha</p>
        </div>
      )}

      {/* Recent Incidents */}
      {incidents.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span>Incidencias del Día</span>
          </h3>
          
          <div className="space-y-3">
            {incidents.map((incident) => {
              const task = tasks.find(t => t.id === incident.task_id);
              const shift = shifts.find(s => s.id === task?.shift_id);
              
              return (
                <div key={incident.id} className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-red-800">
                        {task?.text || 'Tarea desconocida'}
                      </p>
                      <p className="text-sm text-red-600 capitalize">
                        Turno de {shift?.type} - Reportado por {getUserName(incident.reported_by)}
                      </p>
                    </div>
                    <span className="text-xs text-red-500">
                      {new Date(incident.reported_at).toLocaleTimeString('es-CL', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                  </div>
                  <p className="text-red-700">{incident.note}</p>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default LocationDetails;