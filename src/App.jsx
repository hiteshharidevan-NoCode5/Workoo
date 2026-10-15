import React, { useState, useEffect, useRef } from 'react';
import { 
  Dumbbell, Shield, Play, Plus, Trash2, CheckCircle2, 
  RotateCcw, Download, Upload, Clock, ChevronRight, Activity
} from 'lucide-react';

const MUSCLE_GROUPS = [
  'Chest', 'Back', 'Biceps', 'Triceps', 'Shoulders', 
  'Quads', 'Hamstrings', 'Calves', 'Core'
];

const PRESET_SPLITS = [
  { id: 'split1', name: 'Back, Biceps & Lower Body', muscles: ['Back', 'Biceps', 'Quads', 'Hamstrings', 'Calves'] },
  { id: 'split2', name: 'Quads, Hamstrings & Calves (Leg Day)', muscles: ['Quads', 'Hamstrings', 'Calves'] },
  { id: 'split3', name: 'Chest & Triceps (Push Focus)', muscles: ['Chest', 'Triceps'] },
  { id: 'split4', name: 'Core Day (Abs & Stability)', muscles: ['Core'] },
  { id: 'split5', name: 'Shoulder & Chest', muscles: ['Shoulders', 'Chest'] }
];

const DEFAULT_EXERCISES = [
  { id: 'e1', name: 'Barbell Bench Press', muscle: 'Chest' },
  { id: 'e2', name: 'Incline Dumbbell Press', muscle: 'Chest' },
  { id: 'e3', name: 'Barbell Deadlift', muscle: 'Back' },
  { id: 'e4', name: 'Lat Pulldown / Pull-ups', muscle: 'Back' },
  { id: 'e5', name: 'Barbell Bicep Curl', muscle: 'Biceps' },
  { id: 'e6', name: 'Tricep Rope Pushdown', muscle: 'Triceps' },
  { id: 'e7', name: 'Overhead Shoulder Press', muscle: 'Shoulders' },
  { id: 'e8', name: 'Barbell Squat', muscle: 'Quads' },
  { id: 'e9', name: 'Romanian Deadlift', muscle: 'Hamstrings' },
  { id: 'e10', name: 'Standing Calf Raise', muscle: 'Calves' },
  { id: 'e11', name: 'Hanging Leg Raise', muscle: 'Core' },
  { id: 'e12', name: 'Plank', muscle: 'Core' }
];

export default function App() {
  const [activeTab, setActiveTab] = useState('split');
  const [selectedMuscles, setSelectedMuscles] = useState(['Chest', 'Triceps']);
  const [exercises, setExercises] = useState(() => {
    const saved = localStorage.getItem('workoo_exercises');
    return saved ? JSON.parse(saved) : DEFAULT_EXERCISES;
  });

  const [activeWorkout, setActiveWorkout] = useState(() => {
    const saved = localStorage.getItem('workoo_active');
    return saved ? JSON.parse(saved) : null;
  });

  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('workoo_exercises', JSON.stringify(exercises));
  }, [exercises]);

  useEffect(() => {
    localStorage.setItem('workoo_active', JSON.stringify(activeWorkout));
  }, [activeWorkout]);

  useEffect(() => {
    if (timerRunning && timerSeconds > 0) {
      timerRef.current = setInterval(() => {
        setTimerSeconds(s => s - 1);
      }, 1000);
    } else if (timerSeconds === 0) {
      setTimerRunning(false);
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [timerRunning, timerSeconds]);

  const toggleMuscle = (muscle) => {
    setSelectedMuscles(prev => 
      prev.includes(muscle) ? prev.filter(m => m !== muscle) : [...prev, muscle]
    );
  };

  const startWorkoutFromSelection = () => {
    const matching = exercises.filter(e => selectedMuscles.includes(e.muscle));
    setActiveWorkout({
      startedAt: new Date().toISOString(),
      name: selectedMuscles.join(' + ') + ' Session',
      items: matching.map(m => ({
        id: m.id,
        name: m.name,
        muscle: m.muscle,
        sets: [{ weight: '', reps: '', done: false }]
      }))
    });
    setActiveTab('session');
  };

  const addSet = (itemIndex) => {
    const updated = { ...activeWorkout };
    updated.items[itemIndex].sets.push({ weight: '', reps: '', done: false });
    setActiveWorkout(updated);
  };

  const toggleSetDone = (itemIdx, setIdx) => {
    const updated = { ...activeWorkout };
    const currentStatus = updated.items[itemIdx].sets[setIdx].done;
    updated.items[itemIdx].sets[setIdx].done = !currentStatus;
    setActiveWorkout(updated);
    if (!currentStatus) {
      setTimerSeconds(60);
      setTimerRunning(true);
    }
  };

  const exportData = () => {
    const data = { exercises, activeWorkout };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workoo-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#090d16', color: '#f1f5f9', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      <header style={{ padding: '16px 20px', borderBottom: '1px solid #1e293b', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Dumbbell color="#38bdf8" size={24} />
          <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: 0, letterSpacing: '-0.5px' }}>Workoo</h1>
          <span style={{ fontSize: '11px', background: '#0284c7', color: '#fff', padding: '2px 8px', borderRadius: '12px' }}>Offline</span>
        </div>
        <button onClick={() => setActiveTab('privacy')} style={{ background: 'transparent', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
          <Shield size={20} />
        </button>
      </header>

      <main style={{ maxWidth: '640px', margin: '0 auto', padding: '20px 16px 90px 16px' }}>
        
        {activeTab === 'split' && (
          <div>
            <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>1. Preset Splits</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
              {PRESET_SPLITS.map(split => (
                <button
                  key={split.id}
                  onClick={() => setSelectedMuscles(split.muscles)}
                  style={{
                    textAlign: 'left',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid #334155',
                    background: '#1e293b',
                    color: '#fff',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: '600', fontSize: '14px' }}>{split.name}</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>{split.muscles.join(', ')}</div>
                  </div>
                  <ChevronRight size={16} color="#64748b" />
                </button>
              ))}
            </div>

            <h2 style={{ fontSize: '18px', marginBottom: '8px' }}>2. Or Select Target Muscles</h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
              {MUSCLE_GROUPS.map(muscle => {
                const active = selectedMuscles.includes(muscle);
                return (
                  <button
                    key={muscle}
                    onClick={() => toggleMuscle(muscle)}
                    style={{
                      padding: '8px 14px',
                      borderRadius: '20px',
                      fontSize: '13px',
                      border: active ? '1px solid #38bdf8' : '1px solid #334155',
                      background: active ? '#0284c7' : '#1e293b',
                      color: active ? '#fff' : '#cbd5e1',
                      cursor: 'pointer'
                    }}
                  >
                    {muscle}
                  </button>
                );
              })}
            </div>

            <button
              onClick={startWorkoutFromSelection}
              disabled={selectedMuscles.length === 0}
              style={{
                width: '100%',
                padding: '14px',
                background: selectedMuscles.length === 0 ? '#334155' : '#0284c7',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontWeight: 'bold',
                cursor: selectedMuscles.length === 0 ? 'not-allowed' : 'pointer',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Play size={18} /> Start Workout Session
            </button>
          </div>
        )}

        {activeTab === 'session' && (
          <div>
            {!activeWorkout ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                <Activity size={48} style={{ opacity: 0.4, marginBottom: '12px' }} />
                <p>No active workout underway.</p>
                <button onClick={() => setActiveTab('split')} style={{ color: '#38bdf8', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                  Pick a split to begin &rarr;
                </button>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: '18px' }}>{activeWorkout.name}</h2>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>All data stored locally</span>
                  </div>
                  <button 
                    onClick={() => { if(confirm('Finish and clear active workout?')) setActiveWorkout(null); }}
                    style={{ background: '#dc2626', border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                  >
                    Finish
                  </button>
                </div>

                {timerSeconds > 0 && (
                  <div style={{ background: '#1e293b', border: '1px solid #38bdf8', padding: '12px', borderRadius: '8px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Clock size={18} color="#38bdf8" />
                      <span style={{ fontWeight: 'bold' }}>Rest Timer: {timerSeconds}s</span>
                    </div>
                    <button onClick={() => setTimerSeconds(0)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>Dismiss</button>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {activeWorkout.items.map((item, itemIdx) => (
                    <div key={item.id} style={{ background: '#1e293b', borderRadius: '8px', padding: '16px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ fontWeight: '600' }}>{item.name}</span>
                        <span style={{ fontSize: '12px', color: '#38bdf8' }}>{item.muscle}</span>
                      </div>
                      
                      {item.sets.map((set, sIdx) => (
                        <div key={sIdx} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                          <span style={{ width: '24px', fontSize: '12px', color: '#94a3b8' }}>#{sIdx + 1}</span>
                          <input 
                            placeholder="kg" 
                            style={{ width: '60px', padding: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} 
                          />
                          <input 
                            placeholder="reps" 
                            style={{ width: '60px', padding: '6px', background: '#0f172a', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} 
                          />
                          <button
                            onClick={() => toggleSetDone(itemIdx, sIdx)}
                            style={{ 
                              marginLeft: 'auto', 
                              background: set.done ? '#10b981' : '#334155', 
                              border: 'none', 
                              color: '#fff', 
                              padding: '6px 12px', 
                              borderRadius: '4px',
                              cursor: 'pointer' 
                            }}
                          >
                            <CheckCircle2 size={16} />
                          </button>
                        </div>
                      ))}

                      <button 
                        onClick={() => addSet(itemIdx)}
                        style={{ marginTop: '8px', background: 'transparent', border: '1px dashed #475569', color: '#cbd5e1', padding: '6px', width: '100%', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}
                      >
                        + Add Set
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'privacy' && (
          <div style={{ background: '#1e293b', padding: '20px', borderRadius: '8px' }}>
            <h2 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield color="#10b981" /> 100% Privacy Guarantee
            </h2>
            <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6' }}>
              Workoo never tracks you, includes no analytics SDKs, serves no ads, and has no backend database. 
              All workouts, splits, and rep logs reside solely inside your browser's local cache.
            </p>
            <hr style={{ borderColor: '#334155', margin: '16px 0' }} />
            <h3 style={{ fontSize: '14px', marginBottom: '12px' }}>Local Storage Management</h3>
            <button 
              onClick={exportData}
              style={{ width: '100%', padding: '10px', background: '#0284c7', border: 'none', borderRadius: '6px', color: '#fff', fontWeight: 'bold', cursor: 'pointer', marginBottom: '10px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            >
              <Download size={16} /> Export Data as JSON
            </button>
            <button 
              onClick={() => { if(confirm('Clear all local data?')) { localStorage.clear(); window.location.reload(); } }}
              style={{ width: '100%', padding: '10px', background: 'transparent', border: '1px solid #ef4444', borderRadius: '6px', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            >
              <Trash2 size={16} /> Wipe Local Storage
            </button>
          </div>
        )}

      </main>

      <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: '#0f172a', borderTop: '1px solid #1e293b', display: 'flex', justifyContent: 'space-around', padding: '12px 0' }}>
        <button 
          onClick={() => setActiveTab('split')}
          style={{ background: 'none', border: 'none', color: activeTab === 'split' ? '#38bdf8' : '#64748b', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '11px', gap: '4px' }}
        >
          <Dumbbell size={20} />
          <span>Splits</span>
        </button>
        <button 
          onClick={() => setActiveTab('session')}
          style={{ background: 'none', border: 'none', color: activeTab === 'session' ? '#38bdf8' : '#64748b', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '11px', gap: '4px' }}
        >
          <Activity size={20} />
          <span>Workout</span>
        </button>
        <button 
          onClick={() => setActiveTab('privacy')}
          style={{ background: 'none', border: 'none', color: activeTab === 'privacy' ? '#38bdf8' : '#64748b', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: '11px', gap: '4px' }}
        >
          <Shield size={20} />
          <span>Privacy</span>
        </button>
      </nav>
    </div>
  );
}
