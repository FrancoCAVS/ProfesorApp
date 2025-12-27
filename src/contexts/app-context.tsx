
'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import type { Event, Subject, AttendanceRecord, UserProfile, SentEmail, AcademicPeriod, FollowUpTask, Institution, CronogramaEntry } from '@/lib/types';
import { supabase } from '@/lib/supabase/client';
import { format, isSameDay } from 'date-fns';

function generateDeterministicUUID(namespace: string, name: string): string {
  // Create a more robust hash from the input
  const str = `${namespace}${name}`;
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  
  const hash = 4294967296 * (2097151 & h2) + (h1 >>> 0);
  const hex = Math.abs(hash).toString(16).padStart(32, '0');
  
  // Format as valid UUID v5
  return `${hex.substring(0,8)}-${hex.substring(8,12)}-5${hex.substring(13,16)}-${(parseInt(hex.substring(16,18), 16) & 0x3f | 0x80).toString(16)}${hex.substring(18,20)}-${hex.substring(20,32)}`;
}


// Helper to parse data coming from Supabase, converting date strings to Date objects.
const parseSupabaseData = <T extends Record<string, any>>(data: any[]): T[] => {
    if (!data) return [];
    
    const dateFields: string[] = ['event_datetime', 'end_datetime', 'roleStartDate', 'date', 'startDate', 'endDate', 'sentAt', 'createdAt', 'dueDate', 'originalEventDate'];
    
    const jsonFields: string[] = ['program', 'reminder', 'authorities', 'universityBodies', 'careerBodies', 'dailySummary', 'unrecordedAttendance', 'channels', 'userProfile', 'class_groups'];

    return data.map(item => {
        const newItem = { ...item };
        for (const key in newItem) {
            if (dateFields.includes(key) && typeof newItem[key] === 'string') {
                const date = new Date(newItem[key]);
                if (!isNaN(date.getTime())) {
                    newItem[key] = date;
                }
            }
            // Solo parseamos si es string y está en la lista de campos JSON reales
            if (jsonFields.includes(key) && typeof newItem[key] === 'string') {
                try {
                    newItem[key] = JSON.parse(newItem[key]);
                } catch (e) {
                    console.warn(`Could not parse JSON for field ${key}:`, e);
                }
            }
        }
        return newItem as T;
    });
};

// Custom hook to manage state synchronized with a Supabase table.
function useSupabaseTableState<T extends { id: string | number }>(
  tableName: string
) {
  const [state, setState] = useState<T[]>([]);
  const jsonFields: string[] = ['program', 'reminder', 'authorities', 'universityBodies', 'careerBodies', 'dailySummary', 'unrecordedAttendance', 'channels', 'class_groups'];


  useEffect(() => {
    const fetchData = async () => {
      const { data, error } = await supabase.from(tableName).select('*');
      if (error) {
        console.error(`Error fetching ${tableName}:`, error);
      } else {
        setState(parseSupabaseData<T>(data));
      }
    };
    fetchData();
  }, [tableName]);

  const addItem = async (item: Omit<T, 'id'> | T) => {
    const itemToSend = { ...item } as any;
    
    // Ensure `subject_id` is null if it's an empty string or undefined
    if ('subject_id' in itemToSend && !itemToSend.subject_id) {
        itemToSend.subject_id = null;
    }
    
    if ('academicPeriodId' in itemToSend && itemToSend.academicPeriodId === undefined) {
        itemToSend.academicPeriodId = null;
    }
    for (const key in itemToSend) {
        if (jsonFields.includes(key) && typeof itemToSend[key] === 'object') {
            itemToSend[key] = JSON.stringify(itemToSend[key]);
        }
    }
    const { data, error } = await supabase.from(tableName).insert([itemToSend]).select();
    if (error) {
      console.error(`Error adding to ${tableName}:`, error.message, itemToSend);
    } else if (data) {
      setState(prev => [...prev, ...parseSupabaseData<T>(data)]);
    }
  };

  const addMultipleItems = async (items: Omit<T, 'id'>[]) => {
    if (items.length === 0) return;
    const itemsToSend = items.map(item => {
      const itemCopy = {...item} as any;
      for (const key in itemCopy) {
        if (jsonFields.includes(key) && typeof itemCopy[key] === 'object') {
            itemCopy[key] = JSON.stringify(itemCopy[key]);
        }
        if (itemCopy[key] === undefined) {
          itemCopy[key] = null;
        }
      }
      return itemCopy;
    });
    const { data, error } = await supabase.from(tableName).insert(itemsToSend).select();
    if (error) {
        console.error(`Error adding multiple items to ${tableName}:`, error);
    } else if (data) {
        setState(prev => [...prev, ...parseSupabaseData<T>(data)]);
    }
  };

  const updateItem = async (updatedItem: Partial<T> & { id: string | number }) => {
    const itemToSend = { ...updatedItem } as any;

    if ('subject_id' in itemToSend && !itemToSend.subject_id) {
        itemToSend.subject_id = null;
    }

    for (const key in itemToSend) {
        if (jsonFields.includes(key) && typeof itemToSend[key] === 'object') {
            itemToSend[key] = JSON.stringify(itemToSend[key]);
        }
        if (itemToSend[key] === undefined) {
          itemToSend[key] = null;
        }
    }
    const { data, error } = await supabase.from(tableName).update(itemToSend).eq('id', itemToSend.id).select();
    if (error) {
      console.error(`Error updating ${tableName}:`, error);
    } else if (data) {
      setState(prev => prev.map(item => item.id === updatedItem.id ? parseSupabaseData<T>(data)[0] : item));
    }
  };

  const deleteItem = async (itemId: string | number) => {
    const { error } = await supabase.from(tableName).delete().eq('id', itemId);
    if (error) {
      console.error(`Error deleting from ${tableName}:`, error);
    } else {
      setState(prev => prev.filter(item => item.id !== itemId));
    }
  };

  const deleteMultipleItems = async (itemIds: Set<string | number>) => {
    const { error } = await supabase.from(tableName).delete().in('id', Array.from(itemIds));
    if (error) {
      console.error(`Error deleting multiple items from ${tableName}:`, error);
    } else {
      setState(prev => prev.filter(item => !itemIds.has(item.id)));
    }
  };
  
  return { state, setState, addItem, addMultipleItems, updateItem, deleteItem, deleteMultipleItems };
}

interface AppContextType {
  isAuthenticated: boolean;
  login: (user: string, pass: string) => boolean;
  logout: () => void;

  events: Event[];
  addEvent: (event: Omit<Event, 'id' | 'status'>) => void;
  addMultipleEvents: (events: Omit<Event, 'id' | 'status'>[]) => void;
  updateEvent: (event: Partial<Event> & { id: string }) => void;
  deleteEvent: (eventId: string) => void;
  deleteMultipleEvents: (eventIds: Set<string>) => void;
  archiveEvent: (eventId: string) => void;
  unarchiveEvent: (eventId: string) => void;
  updateEventAttendance: (eventId: string, attendanceStatus: 'attended' | 'missed' | undefined, notes?: string) => void;
  
  subjects: Subject[];
  addSubject: (subject: Omit<Subject, 'id' | 'status'>) => void;
  updateSubject: (subject: Partial<Subject> & { id: string }) => void;
  deleteSubject: (subjectId: string) => void;
  archiveSubject: (subjectId: string) => void;
  unarchiveEvent: (subjectId: string) => void;
  duplicateSubject: (subjectId: string) => void;
  archiveMultipleSubjects: (subjectIds: Set<string>) => void;
  deleteMultipleSubjects: (subjectIds: Set<string>) => void;
  
  attendanceRecords: AttendanceRecord[];
  addAttendanceRecord: (record: AttendanceRecord) => void;
  updateAttendanceRecord: (record: AttendanceRecord) => void;
  deleteAttendanceRecord: (recordId: string) => void;

  academicPeriods: AcademicPeriod[];
  addAcademicPeriod: (period: Omit<AcademicPeriod, 'id'>) => void;
  updateAcademicPeriod: (period: AcademicPeriod) => void;
  deleteAcademicPeriod: (periodId: string) => void;
  
  institutions: Institution[];
  addInstitution: (institution: Omit<Institution, 'id'>) => void;
  updateInstitution: (institution: Institution) => void;
  deleteInstitution: (institutionId: string) => void;

  cronogramaData: CronogramaEntry[];
  updateCronogramaEntry: (entry: Partial<CronogramaEntry> & { subjectId: string; groupId: string; date: string; }) => void;

  userProfile: UserProfile;
  customEventTypes: string[];
  superiorRoles: string[];
  secondaryRoles: string[];
  secondaryOrientations: string[];
  lastSummarySentForWeek: string | null;
  calendarImageUrl: string | null;
  lastDailySummarySentFor: string | null;
  updateUserProfile: (profile: Partial<UserProfile>) => void;
  addCustomEventType: (type: string) => void;
  addSuperiorRole: (role: string) => void;
  addSecondaryRole: (role: string) => void;
  addSecondaryOrientation: (orientation: string) => void;
  markSummaryAsSent: (weekIdentifier: string) => void;
  setCalendarImageUrl: (url: string | null) => void;
  markDailySummaryAsSent: (dateIdentifier: string) => void;
  
  sentEmails: SentEmail[];
  addSentEmail: (email: Omit<SentEmail, 'id' | 'sentAt'>) => void;
  deleteSentEmail: (emailId: string) => void;
  deleteMultipleSentEmails: (emailIds: Set<string>) => void;

  followUpTasks: FollowUpTask[];
  addFollowUpTask: (task: Omit<FollowUpTask, 'id' | 'status' | 'createdAt'>) => void;
  updateFollowUpTask: (task: FollowUpTask) => void;
  updateFollowUpTaskStatus: (taskId: string, status: 'pending' | 'completed') => void;
  deleteFollowUpTask: (taskId: string) => void;

  getBackupData: () => Record<string, any>;
  restoreBackupData: (data: Record<string, any>) => Promise<boolean>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);


export const AppProvider = ({ children }: { children: ReactNode }) => {
  const { state: events, setState: setEvents, addItem: addEventDirect, addMultipleItems: addMultipleEventsDirect, updateItem: updateEvent, deleteItem: deleteEvent, deleteMultipleItems: deleteMultipleEvents } = useSupabaseTableState<Event>('events');
  const { state: subjects, setState: setSubjects, addItem: addSubjectDirect, updateItem: updateSubject, deleteItem: deleteSubject, deleteMultipleItems: deleteMultipleSubjects } = useSupabaseTableState<Subject>('subjects');
  const { state: attendanceRecords, setState: setAttendanceRecords, addItem: addAttendanceRecord, updateItem: updateAttendanceRecord, deleteItem: deleteAttendanceRecord } = useSupabaseTableState<AttendanceRecord>('attendance_records');
  const { state: academicPeriods, setState: setAcademicPeriods, addItem: addAcademicPeriod, updateItem: updateAcademicPeriod, deleteItem: deleteAcademicPeriod } = useSupabaseTableState<AcademicPeriod>('academic_periods');
  const { state: institutions, setState: setInstitutions, addItem: addInstitutionDirect, updateItem: updateInstitution, deleteItem: deleteInstitution } = useSupabaseTableState<Institution>('institutions');
  const { state: sentEmails, setState: setSentEmails, addItem: addSentEmailDirect, deleteItem: deleteSentEmail, deleteMultipleItems: deleteMultipleSentEmails } = useSupabaseTableState<SentEmail>('sent_emails');
  const { state: followUpTasks, setState: setFollowUpTasks, addItem: addFollowUpTaskDirect, updateItem: updateFollowUpTask, deleteItem: deleteFollowUpTask } = useSupabaseTableState<FollowUpTask>('follow_up_tasks');
  const { state: cronogramaData, setState: setCronogramaData, addItem: addCronogramaEntry } = useSupabaseTableState<CronogramaEntry>('cronograma_data');
  const [config, setConfig] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);


  useEffect(() => {
    const fetchConfig = async () => {
      const { data, error } = await supabase.from('config').select('*').limit(1).single();
      if (error) {
        console.error('Error fetching config, using defaults:', error);
        setConfig({});
      }
      if (data) {
        setConfig(parseSupabaseData<any>([data])[0]);
      } else {
        setConfig({});
      }
    };
    fetchConfig();
    
    // Check auth status on initial load
    const checkAuth = () => {
      if (typeof window !== 'undefined') {
        const authStatus = localStorage.getItem('isAuthenticated');
        setIsAuthenticated(authStatus === 'true');
      }
    };
    checkAuth();

  }, []);

  const login = (user: string, pass: string): boolean => {
    // Simple hardcoded credentials for demo purposes
    if (user === 'admin' && pass === 'yampa$78') {
        if (typeof window !== 'undefined') {
            localStorage.setItem('isAuthenticated', 'true');
        }
        setIsAuthenticated(true);
        return true;
    }
    return false;
  };

  const logout = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('isAuthenticated');
    }
    setIsAuthenticated(false);
  };

  const updateConfig = useCallback(async (newConfig: Partial<typeof config>) => {
    if (config === null) return;
  
    const payload: { [key: string]: any } = {};
    const jsonFields = ['userProfile', 'customEventTypes', 'superiorRoles', 'secondaryRoles', 'secondaryOrientations'];
  
    // Populate payload only with the keys from newConfig
    for (const key of Object.keys(newConfig) as Array<keyof typeof newConfig>) {
      payload[key] = newConfig[key];
    }
  
    // Stringify JSON fields that are present in the payload
    for (const key of Object.keys(payload)) {
      if (jsonFields.includes(key) && typeof payload[key] === 'object' && payload[key] !== null) {
        payload[key] = JSON.stringify(payload[key]);
      }
    }
    
    const { data, error } = await supabase.from('config').update(payload).eq('id', 1).select();
    
    if (error) {
      console.error('Error updating config:', error.message, payload);
    } else if (data) {
      setConfig(parseSupabaseData<any>(data)[0]);
    }
  }, [config]);

  const updateCronogramaEntry = async (entry: Partial<CronogramaEntry> & { subjectId: string; groupId: string; date: string; }) => {
    const { data, error } = await supabase.from('cronograma_data').upsert(entry, { onConflict: 'subjectId,groupId,date' }).select();
    if (error) {
      console.error('Error updating cronograma entry:', error);
    } else if (data) {
      setCronogramaData(prev => {
        const index = prev.findIndex(e => e.subjectId === entry.subjectId && e.groupId === entry.groupId && e.date === entry.date);
        const newCronograma = [...prev];
        if (index > -1) newCronograma[index] = data[0];
        else newCronograma.push(data[0]);
        return newCronograma;
      });
    }
  };

  const userProfile = config?.userProfile || { name: 'Docente', email: 'tu-email@ejemplo.com' };
  const customEventTypes = config?.customEventTypes || [];
  const superiorRoles = config?.superiorRoles || ['Titular', 'Adjunto', 'JTP', 'Ayudante de 1ra'];
  const secondaryRoles = config?.secondaryRoles || ['Titular', 'Interino', 'Suplente'];
  const secondaryOrientations = config?.secondaryOrientations || ['Ciencias Sociales', 'Ciencias Naturales', 'Economía y Administración', 'Arte', 'Turismo'];
  
  const addEvent = (event: Omit<Event, 'id' | 'status'>) => addEventDirect({ ...event, status: 'active' } as any);
  const addMultipleEvents = (events: Omit<Event, 'id' | 'status'>[]) => {
    const eventsWithStatus = events.map(event => ({ ...event, status: 'active' }));
    addMultipleEventsDirect(eventsWithStatus as any);
  };
  const addSubject = (subject: Omit<Subject, 'id' | 'status'>) => addSubjectDirect({ ...subject, status: 'active' } as any);
  const addInstitution = (institution: Omit<Institution, 'id'>) => addInstitutionDirect(institution as any);

  const archiveEvent = (eventId: string) => updateEvent({ id: eventId, status: 'archived' } as any);
  const unarchiveEvent = (eventId: string) => updateEvent({ id: eventId, status: 'active' } as any);
  
  const updateEventAttendance = (eventId: string, attendanceStatus: 'attended' | 'missed' | undefined, notes = '') => {
    const event = events.find(e => e.id === eventId);
    if (!event) return;

    // First, update the event itself to show status on calendar
    updateEvent({ id: eventId, attendance_status: attendanceStatus, attendance_notes: notes } as any);

    const isExam = event.event_type.startsWith('EXAM_');
    if (!isExam) return; 
    if (!event.subject_id) return;

    const classGroupIdForRecord = '00000000-0000-0000-0000-000000000000'; // Placeholder UUID for events
    
    // Use the event ID for a unique attendance record ID for this event instance
        // Generate a deterministic UUID based on the event ID
        const namespace = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
        const attendanceRecordId = generateDeterministicUUID(namespace, event.id);
        const existingRecord = attendanceRecords.find(r => r.id === attendanceRecordId);

    if (attendanceStatus) {
      const recordData: Omit<AttendanceRecord, 'id'> = {
        date: event.event_datetime,
        subject_id: event.subject_id,
        class_group_id: classGroupIdForRecord,
        start_time: format(event.event_datetime, 'HH:mm'),
        end_time: format(event.end_datetime || new Date(event.event_datetime.getTime() + 60*60*1000), 'HH:mm'),
        status: attendanceStatus === 'attended' ? 'present' : 'absent',
        notes: notes,
        justification: attendanceStatus === 'missed' ? 'justificada' : undefined,
      };

      if (existingRecord) {
        updateAttendanceRecord({ ...recordData, id: existingRecord.id });
      } else {
        addAttendanceRecord({ ...recordData, id: attendanceRecordId });
      }
    } else {
      // If attendanceStatus is undefined, it means we are clearing the status
      if (existingRecord) {
        deleteAttendanceRecord(existingRecord.id);
      }
    }
  };

  const archiveSubject = (subjectId: string) => updateSubject({ id: subjectId, status: 'archived' } as any);
  const unarchiveSubject = (subjectId: string) => updateSubject({ id: subjectId, status: 'active' } as any);

  const duplicateSubject = (subjectId: string) => {
    const original = subjects.find(s => s.id === subjectId);
    if (!original) return;
    const { id, ...newSubjectData } = original;
    addSubject({ ...newSubjectData, name: `${original.name} (Copia)` });
  };
  
  const archiveMultipleSubjects = async (subjectIds: Set<string>) => {
    const updates = Array.from(subjectIds).map(id => ({ id, status: 'archived' }));
    const { error } = await supabase.from('subjects').upsert(updates);
    if (!error) {
      setSubjects(prev => prev.map(s => subjectIds.has(s.id) ? { ...s, status: 'archived' } : s));
    }
  };

  const addSentEmail = (email: Omit<SentEmail, 'id' | 'sentAt'>) => addSentEmailDirect({ ...email, sentAt: new Date() } as any);
  
  const addFollowUpTask = (task: Omit<FollowUpTask, 'id' | 'status' | 'createdAt'>) => addFollowUpTaskDirect({ ...task, status: 'pending', createdAt: new Date() } as any);
  const updateFollowUpTaskStatus = (taskId: string, status: 'pending' | 'completed') => updateFollowUpTask({ id: taskId, status } as any);
  
  const updateUserProfile = (profile: Partial<UserProfile>) => {
      const currentProfile = config?.userProfile || {};
      updateConfig({ userProfile: { ...currentProfile, ...profile } });
  };
  const addCustomEventType = (type: string) => {
      const currentTypes = config?.customEventTypes || [];
      updateConfig({ customEventTypes: [...currentTypes, type] });
  };
  const addSuperiorRole = (role: string) => {
      const currentRoles = config?.superiorRoles || [];
      updateConfig({ superiorRoles: [...currentRoles, role] });
  };
  const addSecondaryRole = (role: string) => {
      const currentRoles = config?.secondaryRoles || [];
      updateConfig({ secondaryRoles: [...currentRoles, role] });
  };
  const addSecondaryOrientation = (orientation: string) => {
      const currentOrientations = config?.secondaryOrientations || [];
      updateConfig({ secondaryOrientations: [...currentOrientations, orientation] });
  };
  const markSummaryAsSent = (weekIdentifier: string) => updateConfig({ lastSummarySentForWeek: weekIdentifier });
  const setCalendarImageUrl = (url: string | null) => updateConfig({ calendarImageUrl: url });
  const markDailySummaryAsSent = (dateIdentifier: string) => updateConfig({ lastDailySummaryAsSentFor: dateIdentifier });


  const getBackupData = () => ({
    config: config,
    institutions,
    academicPeriods,
    subjects,
    events,
    attendanceRecords,
    followUpTasks,
    cronogramaData,
    sentEmails,
  });
  
  const restoreBackupData = async (data: any): Promise<boolean> => {
    const requiredKeys = ['config', 'institutions', 'academicPeriods', 'subjects', 'events', 'attendanceRecords', 'followUpTasks', 'cronogramaData', 'sentEmails'];
    const hasAllKeys = requiredKeys.every(key => key in data && (Array.isArray(data[key]) || typeof data[key] === 'object'));
    
    if (!hasAllKeys) {
        console.error("Backup data is missing required keys", {
            missing: requiredKeys.filter(k => !(k in data))
        });
        return false;
    }

    try {
        const tableKeys = requiredKeys.filter(k => k !== 'config');
        
        // Batch delete operations
        await Promise.all(tableKeys.map(key => supabase.from(key).delete().neq('id', crypto.randomUUID())));
        
        // Update config
        const { id, ...configData } = data.config;
        await supabase.from('config').update(configData).eq('id', 1);

        // Batch insert operations
        for (const key of tableKeys) {
            if (data[key] && data[key].length > 0) {
                const parsedData = data[key].map((item: any) => {
                    const newItem = {...item};
                    const jsonFields: {[key: string]: string[]} = {
                        subjects: ['class_groups', 'program'],
                        events: ['reminder'],
                        followUpTasks: ['reminder'],
                        institutions: ['authorities', 'universityBodies', 'careerBodies'],
                    };

                    if(jsonFields[key]) {
                        jsonFields[key].forEach(field => {
                            if(typeof newItem[field] === 'string') {
                                try {
                                    newItem[field] = JSON.parse(newItem[field]);
                                } catch (e) {
                                    console.warn(`Could not parse JSON for field ${field} in table ${key}`);
                                }
                            }
                        });
                    }
                    return newItem;
                });
                await supabase.from(key).insert(parsedData);
            }
        }
        
        // Manually refetch all data to update the UI
        const allData = await Promise.all([
            supabase.from('config').select('*').limit(1).single(),
            ...tableKeys.map(key => supabase.from(key).select('*'))
        ]);
        
        setConfig(allData[0].data);
        setInstitutions(parseSupabaseData(allData[1].data || []));
        setAcademicPeriods(parseSupabaseData(allData[2].data || []));
        setSubjects(parseSupabaseData(allData[3].data || []));
        setEvents(parseSupabaseData(allData[4].data || []));
        setAttendanceRecords(parseSupabaseData(allData[5].data || []));
        setFollowUpTasks(parseSupabaseData(allData[6].data || []));
        setCronogramaData(parseSupabaseData(allData[7].data || []));
        setSentEmails(parseSupabaseData(allData[8].data || []));
        
        return true;

    } catch (error) {
        console.error('Error during data restoration:', error);
        return false;
    }
  };


  return (
    <AppContext.Provider value={{
      isAuthenticated, login, logout,
      events, addEvent, addMultipleEvents, updateEvent, deleteEvent, deleteMultipleEvents, archiveEvent, unarchiveEvent, updateEventAttendance,
      subjects, addSubject, updateSubject, deleteSubject, archiveSubject, unarchiveEvent, duplicateSubject, archiveMultipleSubjects, deleteMultipleSubjects,
      attendanceRecords, addAttendanceRecord, updateAttendanceRecord, deleteAttendanceRecord,
      academicPeriods, addAcademicPeriod, updateAcademicPeriod, deleteAcademicPeriod,
      institutions, addInstitution, updateInstitution, deleteInstitution,
      cronogramaData, updateCronogramaEntry,
      userProfile, customEventTypes, superiorRoles, secondaryRoles, secondaryOrientations, 
      updateUserProfile, addCustomEventType, addSuperiorRole, addSecondaryRole, addSecondaryOrientation, markSummaryAsSent, setCalendarImageUrl, markDailySummaryAsSent,
      lastSummarySentForWeek: config?.lastSummarySentForWeek,
      calendarImageUrl: config?.calendarImageUrl,
      lastDailySummarySentFor: config?.lastDailySummarySentFor,
      sentEmails, addSentEmail, deleteSentEmail, deleteMultipleSentEmails,
      followUpTasks, addFollowUpTask, updateFollowUpTask, updateFollowUpTaskStatus, deleteFollowUpTask,
      getBackupData, restoreBackupData
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
