import React, { useState, useEffect } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface IncidentModalProps {
  task: {
    id: string;
    text: string;
  };
  shiftId: string;
  reportedBy: string;
  existingIncident?: {
    id: string;
    note: string;
  };
  onClose: () => void;
  onSaved: () => void;
}

const IncidentModal: React.FC<IncidentModalProps> = ({
  task,
  shiftId,
  reportedBy,
  existingIncident,
  onClose,
  onSaved
}) => {
  const [note, setNote] = useState(existingIncident?.note || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!note.trim()) {
      // If note is empty and incident exists, delete it
      if (existingIncident) {
        setSaving(true);
        try {
          const { error } = await supabase
            .from('incidents')
            .delete()
            .eq('id', existingIncident.id);

          if (error) throw error;
          onSaved();
        } catch (error) {
          console.error('Error deleting incident:', error);
        } finally {
          setSaving(false);
        }
      } else {
        onClose();
      }
      return;
    }

    setSaving(true);
    try {
      if (existingIncident) {
        // Update existing incident
        const { error } = await supabase
          .from('incidents')
          .update({ note: note.trim() })
          .eq('id', existingIncident.id);

        if (error) throw error;
      } else {
        // Create new incident
        const { error } = await supabase
          .from('incidents')
          .insert({
            task_id: task.id,
            shift_id: shiftId,
            reported_by: reportedBy,
            note: note.trim()
          });

        if (error) throw error;
      }

      onSaved();
    } catch (error) {
      console.error('Error saving incident:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            <h2 className="text-xl font-bold text-gray-800">
              {existingIncident ? 'Editar Incidencia' : 'Reportar Incidencia'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <div className="bg-gray-50 rounded-lg p-3 mb-4">
            <p className="text-sm font-medium text-gray-700">Tarea:</p>
            <p className="text-gray-800">{task.text}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Detalle de la incidencia:
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              placeholder="Describe el problema o incidencia..."
            />
          </div>

          {existingIncident && (
            <p className="text-xs text-gray-500 mt-2">
              Deja el campo vacío para eliminar la incidencia.
            </p>
          )}
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Guardando...' : existingIncident ? 'Actualizar' : 'Reportar'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default IncidentModal;