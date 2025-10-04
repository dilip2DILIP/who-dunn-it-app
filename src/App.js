import React, { useState, useEffect } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, setDoc } from 'firebase/firestore';
import { Check, Star, Award, LogOut, Plus, X, AlertCircle } from 'lucide-react';

// REPLACE WITH YOUR FIREBASE CONFIG FROM PART 1, STEP 3
const firebaseConfig = {
  apiKey: "AIzaSyAL3W81ZHsn7IT5NWQ6c-sl-mw--wuHrE0",
  authDomain: "who-dunn-it.firebaseapp.com",
  projectId: "who-dunn-it",
  storageBucket: "who-dunn-it.firebasestorage.app",
  messagingSenderId: "10261671289",
  appId: "1:10261671289:web:7c668cbe8f2174b52793a8"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const USERS = {
  'Dilip': { password: '115960', role: 'manager', name: 'Dilip' },
  'Sarath': { password: '137368', role: 'employee', name: 'Sarath' },
  'Sangeetha': { password: '137799', role: 'employee', name: 'Sangeetha' },
  'Akash': { password: '139405', role: 'employee', name: 'Akash' },
  'Nagendra': { password: '140373', role: 'employee', name: 'Nagendra' },
  'Narendra': { password: '143451', role: 'employee', name: 'Narendra' },
  'Harshith': { password: '144561', role: 'employee', name: 'Harshith' }
};

const EMPLOYEE_NAMES = Object.keys(USERS).filter(u => USERS[u].role === 'employee');

const getColorForDueDate = (dueDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  const diffTime = due - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'bg-red-600';
  if (diffDays === 0) return 'bg-red-500';
  if (diffDays === 1) return 'bg-orange-500';
  if (diffDays === 2) return 'bg-yellow-500';
  if (diffDays === 3) return 'bg-blue-500';
  return 'bg-green-500';
};

const getColorLabel = (dueDate) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);
  
  const diffTime = due - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays < 0) return 'Overdue';
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays === 2) return 'T+2';
  if (diffDays === 3) return 'T+3';
  return 'T+4+';
};

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [tasks, setTasks] = useState([]);
  const [employees, setEmployees] = useState({});
  
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: '', description: '', assignedTo: [], dueDate: '' });

  // Initialize employees in Firebase
  useEffect(() => {
    const initEmployees = async () => {
      for (const name of EMPLOYEE_NAMES) {
        const empRef = doc(db, 'employees', name);
        await setDoc(empRef, { goldenStars: 0, blackStars: 0 }, { merge: true });
      }
    };
    initEmployees();
  }, []);

  // Listen to tasks collection
  useEffect(() => {
    const q = query(collection(db, 'tasks'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const tasksData = [];
      snapshot.forEach((doc) => {
        tasksData.push({ id: doc.id, ...doc.data() });
      });
      setTasks(tasksData);
    });
    return unsubscribe;
  }, []);

  // Listen to employees collection
  useEffect(() => {
    const q = query(collection(db, 'employees'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const empData = {};
      snapshot.forEach((doc) => {
        empData[doc.id] = doc.data();
      });
      setEmployees(empData);
    });
    return unsubscribe;
  }, []);

  const handleLogin = () => {
    const user = USERS[username];
    if (user && user.password === password) {
      setCurrentUser(user);
      setLoginError('');
    } else {
      setLoginError('Invalid username or password');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setUsername('');
    setPassword('');
  };

  const handleCreateTask = async () => {
    if (!newTask.title || !newTask.dueDate || newTask.assignedTo.length === 0) {
      alert('Please fill all required fields');
      return;
    }

    const task = {
      title: newTask.title,
      description: newTask.description,
      assignedTo: newTask.assignedTo,
      dueDate: newTask.dueDate,
      completed: false,
      completedAt: null,
      createdBy: currentUser.name,
      createdAt: new Date().toISOString()
    };

    await addDoc(collection(db, 'tasks'), task);
    setShowTaskModal(false);
    setNewTask({ title: '', description: '', assignedTo: [], dueDate: '' });
  };

  const handleToggleEmployee = (empName) => {
    setNewTask(prev => ({
      ...prev,
      assignedTo: prev.assignedTo.includes(empName)
        ? prev.assignedTo.filter(n => n !== empName)
        : [...prev.assignedTo, empName]
    }));
  };

  const handleCompleteTask = async (taskId) => {
    const now = new Date();
    const currentHour = now.getHours();
    
    const taskRef = doc(db, 'tasks', taskId);
    await updateDoc(taskRef, {
      completed: true,
      completedAt: now.toISOString()
    });

    if (currentHour >= 19) {
      const userTasks = tasks.filter(t => 
        t.assignedTo.includes(currentUser.name) && !t.completed && t.id !== taskId
      );
      
      if (userTasks.length === 0) {
        const empRef = doc(db, 'employees', currentUser.name);
        await updateDoc(empRef, {
          goldenStars: (employees[currentUser.name]?.goldenStars || 0) + 1
        });
        alert('🌟 Congratulations! You earned a Golden Star for completing all tasks before 7 PM!');
      }
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (window.confirm('Are you sure you want to delete this task?')) {
      await deleteDoc(doc(db, 'tasks', taskId));
    }
  };

  const handleGiveBlackStar = async (empName) => {
    if (window.confirm('Give a Black Star to ' + empName + '? This will impact their annual performance.')) {
      const empRef = doc(db, 'employees', empName);
      await updateDoc(empRef, {
        blackStars: (employees[empName]?.blackStars || 0) + 1
      });
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-800 mb-2">Who Dunn It</h1>
            <p className="text-gray-600">Task Management System</p>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter username"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="Enter password"
              />
            </div>
            
            {loginError && (
              <div className="flex items-center gap-2 text-red-600 text-sm">
                <AlertCircle size={16} />
                <span>{loginError}</span>
              </div>
            )}
            
            <button
              onClick={handleLogin}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-indigo-700 transition"
            >
              Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  const userTasks = currentUser.role === 'manager' 
    ? tasks 
    : tasks.filter(t => t.assignedTo.includes(currentUser.name));

  const activeTasks = userTasks.filter(t => !t.completed);
  const completedTasks = userTasks.filter(t => t.completed);

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg">
        <div className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Who Dunn It</h1>
            <p className="text-sm text-purple-100">{currentUser.name} ({currentUser.role})</p>
          </div>
          
          <div className="flex items-center gap-4">
            {currentUser.role === 'employee' && (
              <div className="flex items-center gap-3 bg-white/20 px-4 py-2 rounded-lg">
                <div className="flex items-center gap-1">
                  <Star className="fill-yellow-300 text-yellow-300" size={20} />
                  <span className="font-bold">{employees[currentUser.name]?.goldenStars || 0}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star className="fill-gray-800 text-gray-800" size={20} />
                  <span className="font-bold">{employees[currentUser.name]?.blackStars || 0}</span>
                </div>
              </div>
            )}
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition"
            >
              <LogOut size={18} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        {currentUser.role === 'manager' && (
          <div className="mb-8">
            <button
              onClick={() => setShowTaskModal(true)}
              className="flex items-center gap-2 bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700 transition shadow-lg"
            >
              <Plus size={20} />
              Create New Task
            </button>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              Active Tasks
              <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm">{activeTasks.length}</span>
            </h2>
            
            <div className="space-y-4">
              {activeTasks.length === 0 ? (
                <div className="bg-white rounded-lg p-8 text-center text-gray-500 shadow">
                  <Award size={48} className="mx-auto mb-3 text-gray-400" />
                  <p>No active tasks! Great job!</p>
                </div>
              ) : (
                activeTasks.map(task => (
                  <div key={task.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition">
                    <div className="flex">
                      <div className={'w-3 rounded-l-lg ' + getColorForDueDate(task.dueDate)}></div>
                      <div className="flex-1 p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-bold text-gray-800">{task.title}</h3>
                            {task.description && (
                              <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                            )}
                          </div>
                          {currentUser.role === 'manager' && (
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <X size={18} />
                            </button>
                          )}
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mb-3">
                          {task.assignedTo.map(emp => (
                            <span key={emp} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                              {emp}
                            </span>
                          ))}
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <span className={getColorForDueDate(task.dueDate) + ' text-white px-3 py-1 rounded-full text-xs font-semibold'}>
                              {getColorLabel(task.dueDate)}
                            </span>
                            <span className="text-sm text-gray-500">
                              Due: {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                          </div>
                          
                          {currentUser.role === 'employee' && task.assignedTo.includes(currentUser.name) && (
                            <button
                              onClick={() => handleCompleteTask(task.id)}
                              className="flex items-center gap-1 bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600 transition"
                            >
                              <Check size={16} />
                              Complete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              Completed Tasks
              <span className="bg-green-100 text-green-600 px-3 py-1 rounded-full text-sm">{completedTasks.length}</span>
            </h2>
            
            <div className="space-y-4">
              {completedTasks.length === 0 ? (
                <div className="bg-white rounded-lg p-8 text-center text-gray-500 shadow">
                  <p>No completed tasks yet</p>
                </div>
              ) : (
                completedTasks.map(task => (
                  <div key={task.id} className="bg-white rounded-lg shadow-md opacity-75">
                    <div className="flex">
                      <div className="w-3 bg-green-500 rounded-l-lg"></div>
                      <div className="flex-1 p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="font-bold text-gray-800 line-through">{task.title}</h3>
                            {task.description && (
                              <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                            )}
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-2 mb-3">
                          {task.assignedTo.map(emp => (
                            <span key={emp} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs">
                              {emp}
                            </span>
                          ))}
                        </div>
                        
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-500">
                            Completed: {new Date(task.completedAt).toLocaleString()}
                          </span>
                          
                          {currentUser.role === 'manager' && (
                            <div className="flex gap-2">
                              {task.assignedTo.map(emp => (
                                <button
                                  key={emp}
                                  onClick={() => handleGiveBlackStar(emp)}
                                  className="flex items-center gap-1 bg-gray-800 text-white px-3 py-1 rounded text-xs hover:bg-gray-900 transition"
                                  title={'Give Black Star to ' + emp}
                                >
                                  <Star size={12} />
                                  {emp}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {currentUser.role === 'manager' && (
          <div className="mt-8 bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Employee Performance</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {EMPLOYEE_NAMES.map(emp => (
                <div key={emp} className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-lg p-4">
                  <h3 className="font-bold text-gray-800 mb-2">{emp}</h3>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <Star className="fill-yellow-400 text-yellow-400" size={18} />
                      <span className="font-bold text-lg">{employees[emp]?.goldenStars || 0}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="fill-gray-800 text-gray-800" size={18} />
                      <span className="font-bold text-lg">{employees[emp]?.blackStars || 0}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {showTaskModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">Create New Task</h2>
                <button
                  onClick={() => setShowTaskModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Task Title *</label>
                  <input
                    type="text"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter task title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <textarea
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    placeholder="Enter task description"
                    rows="3"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Due Date *</label>
                  <input
                    type="date"
                    value={newTask.dueDate}
                    onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assign To * (Select employees)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {EMPLOYEE_NAMES.map(emp => (
                      <button
                        key={emp}
                        onClick={() => handleToggleEmployee(emp)}
                        className={'px-4 py-2 rounded-lg border-2 transition ' + (newTask.assignedTo.includes(emp)
                            ? 'bg-purple-600 text-white border-purple-600'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-purple-400')}
                      >
                        {emp}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    onClick={handleCreateTask}
                    className="flex-1 bg-purple-600 text-white py-3 rounded-lg font-semibold hover:bg-purple-700 transition"
                  >
                    Create Task
                  </button>
                  <button
                    onClick={() => setShowTaskModal(false)}
                    className="px-6 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
