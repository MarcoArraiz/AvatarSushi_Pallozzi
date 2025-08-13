import React, { useState, useEffect } from 'react';
import { Sun, Moon, Users, Eye } from 'lucide-react';
import { supabase } from '../lib/supabase';
import AssignTeamModal from './AssignTeamModal';

interface ShiftPanelProps {
  shift: {
    id: string;
    date: string;
    type: 'apertura' | 'cierre';
    area: string;
    assigned_users: string[];
    location_id?: string;
  };
  userProfile: {
    role: 'supervisor' | 'garzon';
  };
  onAssignTeam: () => void;
  onViewDetails: () => void;
}

interface Task {
  id: string;
  status: 'pending' | 'completed';
}

const ShiftPanel: React.FC<ShiftPanelProps> = ({
  shift,
  userProfile,
  onAssignTeam,
  onViewDetails
}) => {
  const [assignedUsers, setAssignedUsers] = useState<any[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadShiftData();
  }, [shift]);

  const loadShiftData = async () => {
    try {
      // Load assigned users
      if (shift.assigned_users.length > 0) {
        const { data: users } = await supabase
          .from('user_profiles')
          .select('id, full_name')
          .in('id', shift.assigned_users);
        
        setAssignedUsers(users || []);
      } else {
        setAssignedUsers([]);
      }

      // Load tasks for progress calculation
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('id, status')
        .eq('shift_id', shift.id);
      
      setTasks(tasksData || []);
    } catch (error) {
      console.error('Error loading shift data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = () => {
    return shift.type === 'apertura' ? Sun : Moon;
  };

  const getColorClasses = () => {
    return shift.type === 'apertura' 
      ? 'text-yellow-600 bg-yellow-100' 
      : 'text-indigo-600 bg-indigo-100';
  };

  const getProgress = () => {
    if (tasks.length === 0) return 0;
    const completedTasks = tasks.filter(task => task.status === 'completed').length;
    return Math.round((completedTasks / tasks.length) * 100);
  };

  const Icon = getIcon();
  const colorClasses = getColorClasses();
  const progress = getProgress();

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-md p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded mb-4"></div>
        <div className="h-4 bg-gray-200 rounded mb-2"></div>
        <div className="h-4 bg-gray-200 rounded"></div>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${colorClasses}`}>
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-gray-800 capitalize">
                Turno de {shift.type}
              </h3>
              <p className="text-sm text-gray-600">Área: Salón</p>
            </div>
          </div>
        </div>

        {assignedUsers.length === 0 ? (
          <div className="text-center py-6">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No hay equipo asignado</p>
            {userProfile.role === 'supervisor' && (
              <button
                onClick={() => setShowAssignModal(true)}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Asignar Equipo
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Assigned Team */}
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">Equipo Asignado:</p>
              <div className="flex flex-wrap gap-2">
                {assignedUsers.map((user) => (
                  <div
                    key={user.id}
                    className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {user.full_name}
                  </div>
                ))}
              </div>
            </div>

            {/* Progress Bar */}
            <div>
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

            {/* Actions */}
            <div className="flex space-x-2 pt-2">
              <button
                onClick={onViewDetails}
                className="flex-1 flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Eye className="w-4 h-4" />
                <span>Ver Detalles</span>
              </button>
              {userProfile.role === 'supervisor' && (
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                >
                  Reasignar
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {showAssignModal && (
        <AssignTeamModal
          shift={shift}
          onClose={() => setShowAssignModal(false)}
          onSuccess={() => {
            setShowAssignModal(false);
            onAssignTeam();
          }}
        />
      )}
    </>
  );
};

export default ShiftPanel;