import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, Flag, Clock, User, AlertTriangle } from 'lucide-react';
import { User as SupabaseUser } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import IncidentModal from './IncidentModal';
import AssignTeamModal from './AssignTeamModal';

interface ShiftDetailsProps {
  shift: {
    id: string;
    type: 'apertura' | 'cierre';
    date: string;
    assigned_users: string[];
    location_id?: string;
  };
  user: SupabaseUser;
  userProfile: {
    role: 'supervisor' | 'garzon';
  };
  locationContext?: {
    id: string;
    name: string;
    address: string;
  };
  onBack: () => void;
  onUpdate: () => void;
}

interface Task {
  id: string;
  text: string;
  category: string;
  subcategory: string;
  status: 'pending' | 'completed';
  completed_by: string | null;
  completed_at: string | null;
  shift_id: string;
}

interface Incident {
  id: string;
  task_id: string;
  reported_by: string;
  note: string;
  reported_at: string;
}

interface UserProfile {
  id: string;
  full_name: string;
}

const TASK_DEFINITIONS = {
  apertura: {
    title: 'Apertura',
    subcategories: {
      terraza: {
        title: 'Montaje de Terraza',
        tasks: [
          'Sacar mesas y sillas',
          'Ordenar terraza',
          'Instalar calefacción',
          'Limpiar mesas y sillas',
          'Colocar QR y velas',
        ]
      },
      salon: {
        title: 'Limpieza del Salón',
        tasks: [
          'Sanitizar superficies',
          'Barrer y trapear',
          'Revisar baños',
          'Encender climatización y TV',
          'Verificar música ambiental'
        ]
      },
      miseEnPlace: {
        title: 'Área de Garzón',
        tasks: [
          'Abastecer insumos',
          'Verificar Transbank',
          'Conocer 86s y promos',
          'Alinear equipo',
          'Revisar uniformes'
        ]
      }
    }
  },
  cierre: {
    title: 'Cierre del Local',
    subcategories: {
      preCierre: {
        title: 'Preparativos',
        tasks: [
          'Anunciar última ronda',
          'Tomar últimos pedidos',
          'Iniciar limpieza gradual'
        ]
      },
      salonCierre: {
        title: 'Cierre de Salón',
        tasks: [
          'Recolectar loza',
          'Barrer y trapear',
          'Limpiar mesas y sillas',
          'Limpieza profunda de baños',
          'Rellenar salsas y reponer insumos',
          'Apagar TV y música'
        ]
      },
      terrazaCierre: {
        title: 'Cierre de Terraza',
        tasks: [
          'Recolectar loza',
          'Limpiar y guardar mesas/sillas',
          'Retirar gas de estufas',
          'Guardar carteles y artefactos',
          'Barrer y lavar piso (si aplica)',
          'Apagar calefacción'
        ]
      },
      final: {
        title: 'Cierre General',
        tasks: [
          'Verificar carga de Transbank',
          'Apagar artefactos y luces',
          'Cerrar llaves de agua',
          'Marcar salida',
          'Activar alarma'
        ]
      }
    }
  }
};

const ShiftDetails: React.FC<ShiftDetailsProps> = ({
  shift,
  user,
  userProfile,
  onBack,
  onUpdate
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [assignedUsers, setAssignedUsers] = useState<UserProfile[]>([]);
  const [actingAs, setActingAs] = useState<string>(user.id);
  const [loading, setLoading] = useState(true);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);

  useEffect(() => {
    loadShiftDetails();
  }, [shift]);

  const loadShiftDetails = async () => {
    try {
      // Load assigned users
      const { data: users } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .in('id', shift.assigned_users);
      
      setAssignedUsers(users || []);

      // Load or create tasks
      await ensureTasksExist();
      
      // Load tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('shift_id', shift.id)
        .order('category, subcategory, text');
      
      setTasks(tasksData || []);

      // Load incidents
      const { data: incidentsData } = await supabase
        .from('incidents')
        .select('*')
        .eq('shift_id', shift.id);
      
      setIncidents(incidentsData || []);
    } catch (error) {
      console.error('Error loading shift details:', error);
    } finally {
      setLoading(false);
    }
  };

  const ensureTasksExist = async () => {
    const { data: existingTasks } = await supabase
      .from('tasks')
      .select('id')
      .eq('shift_id', shift.id)
      .limit(1);

    if (existingTasks && existingTasks.length > 0) {
      return; // Tasks already exist
    }

    // Create tasks based on shift type
    const taskDefinition = TASK_DEFINITIONS[shift.type];
    const tasksToInsert: any[] = [];

    Object.entries(taskDefinition.subcategories).forEach(([subKey, subValue]) => {
      subValue.tasks.forEach((taskText) => {
        tasksToInsert.push({
          shift_id: shift.id,
          text: taskText,
          category: shift.type,
          subcategory: subKey,
          status: 'pending'
        });
      });
    });

    await supabase.from('tasks').insert(tasksToInsert);
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from('tasks')
        .update({
          status: 'completed',
          completed_by: actingAs,
          completed_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;
      
      loadShiftDetails();
      onUpdate();
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const handleReportIncident = (task: Task) => {
    setSelectedTask(task);
    setShowIncidentModal(true);
  };

  const handleIncidentSaved = () => {
    setShowIncidentModal(false);
    setSelectedTask(null);
    loadShiftDetails();
  };

  const handleTeamAssigned = () => {
    setShowAssignModal(false);
    loadShiftDetails();
    onUpdate();
  };

  const getTaskIncident = (taskId: string) => {
    return incidents.find(incident => incident.task_id === taskId);
  };

  const getUserName = (userId: string) => {
    const user = assignedUsers.find(u => u.id === userId);
    return user?.full_name || 'Usuario desconocido';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const taskDefinition = TASK_DEFINITIONS[shift.type];

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
            <div>
              <h2 className="text-2xl font-bold text-gray-800 capitalize">
                Turno de {shift.type}
              </h2>
              {locationContext && (
                <p className="text-sm text-gray-500 mb-1">
                  {locationContext.name} - {locationContext.address}
                </p>
              )}
              <p className="text-gray-600">
                {new Date(shift.date).toLocaleDateString('es-CL', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </div>
          
          {/* Assign Team Button for Supervisors */}
          {userProfile.role === 'supervisor' && (
            <button
              onClick={() => setShowAssignModal(true)}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Users className="w-4 h-4" />
              <span>
                {assignedUsers.length > 0 ? 'Reasignar Equipo' : 'Asignar Equipo'}
              </span>
            </button>
          )}
        </div>

        {/* Acting As Selector */}
        {assignedUsers.length > 1 && (
          <div className="bg-gray-50 rounded-lg p-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Actuando como:
            </label>
            <select
              value={actingAs}
              onChange={(e) => setActingAs(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {assignedUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.full_name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Team Assignment Section for Supervisors */}
      {userProfile.role === 'supervisor' && assignedUsers.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center space-x-2">
            <Users className="w-5 h-5 text-blue-600" />
            <span>Equipo Asignado</span>
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {assignedUsers.map((user) => {
              const userTasks = tasks.filter(task => task.completed_by === user.id);
              const completedCount = userTasks.length;
              
              return (
                <div key={user.id} className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="bg-blue-100 text-blue-600 p-2 rounded-full">
                      <User className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-800">{user.full_name}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <p className="text-2xl font-bold text-green-600">{completedCount}</p>
                    <p className="text-sm text-gray-500">Tareas Completadas</p>
                  </div>
                  
                  {userTasks.length > 0 && (
                    <div className="mt-3 space-y-1">
                      <p className="text-xs font-medium text-gray-700">Últimas tareas:</p>
                      {userTasks.slice(-2).map((task) => (
                        <p key={task.id} className="text-xs text-gray-600 truncate">
                          • {task.text}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tasks by Subcategory */}
      <div className="space-y-6">
        {Object.entries(taskDefinition.subcategories).map(([subKey, subValue]) => {
          const subcategoryTasks = tasks.filter(task => task.subcategory === subKey);
          
          return (
            <div key={subKey} className="bg-white rounded-xl shadow-md p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                {subValue.title}
              </h3>
              
              <div className="space-y-3">
                {subcategoryTasks.map((task) => {
                  const incident = getTaskIncident(task.id);
                  const isCompleted = task.status === 'completed';
                  
                  return (
                    <div
                      key={task.id}
                      className={`flex items-center justify-between p-4 rounded-lg border ${
                        isCompleted ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'
                      }`}
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        <button
                          onClick={() => handleReportIncident(task)}
                          className={`p-1 rounded ${
                            incident ? 'text-red-500' : 'text-gray-400 hover:text-red-500'
                          }`}
                          title={incident ? `Incidencia: ${incident.note}` : 'Reportar incidencia'}
                        >
                          <Flag className="w-4 h-4" />
                        </button>
                        
                        <span className={`flex-1 ${isCompleted ? 'line-through text-gray-500' : ''}`}>
                          {task.text}
                        </span>
                        
                        {incident && (
                          <div className="flex items-center space-x-1 text-red-600 text-sm">
                            <AlertTriangle className="w-4 h-4" />
                            <span>Incidencia reportada</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-3">
                        {isCompleted ? (
                          <div className="flex items-center space-x-2 text-green-600 text-sm">
                            <CheckCircle className="w-4 h-4" />
                            <span>
                              OK por {getUserName(task.completed_by!)} a las{' '}
                              {new Date(task.completed_at!).toLocaleTimeString('es-CL', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleCompleteTask(task.id)}
                            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                          >
                            Completar
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Incident Modal */}
      {showIncidentModal && selectedTask && (
        <IncidentModal
          task={selectedTask}
          shiftId={shift.id}
          reportedBy={actingAs}
          existingIncident={getTaskIncident(selectedTask.id)}
          onClose={() => {
            setShowIncidentModal(false);
            setSelectedTask(null);
          }}
          onSaved={handleIncidentSaved}
        />
      )}

      {/* Team Assignment Modal */}
      {showAssignModal && (
        <AssignTeamModal
          shift={shift}
          onClose={() => setShowAssignModal(false)}
          onSuccess={handleTeamAssigned}
        />
      )}
    </div>
  );
};

export default ShiftDetails;