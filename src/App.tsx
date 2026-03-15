import { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { 
  auth, db 
} from './firebase';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  User
} from 'firebase/auth';
import { 
  collection, 
  query, 
  onSnapshot, 
  doc, 
  getDoc, 
  setDoc,
  addDoc,
  where,
  Timestamp
} from 'firebase/firestore';
import { 
  LayoutDashboard, 
  Building2, 
  Users, 
  Wrench, 
  AlertTriangle, 
  CreditCard, 
  CheckSquare, 
  MessageSquare, 
  LogOut,
  Plus,
  Search,
  Bell,
  ChevronRight,
  Loader2,
  Menu,
  X,
  Database,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile, Building, MaintenanceTicket, Incident, Tenant, RentRecord } from './types';
import { getOperationalSummary, askCopilot } from './services/geminiService';

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
      active 
        ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-white'
    }`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

const StatCard = ({ label, value, icon: Icon, color }: { label: string, value: string | number, icon: any, color: string }) => (
  <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon size={24} className="text-white" />
      </div>
    </div>
    <div className="text-3xl font-bold text-white mb-1">{value}</div>
    <div className="text-sm text-slate-400 font-medium uppercase tracking-wider">{label}</div>
  </div>
);

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Data State
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [rentRecords, setRentRecords] = useState<RentRecord[]>([]);
  const [aiSummary, setAiSummary] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setProfile(docSnap.data() as UserProfile);
        } else {
          // Default profile for new users
          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email || '',
            displayName: user.displayName || '',
            role: 'owner', // Default to owner for MVP testing
            buildingIds: []
          };
          await setDoc(docRef, newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Real-time Data Listeners
  useEffect(() => {
    if (!user) return;

    const unsubBuildings = onSnapshot(collection(db, 'buildings'), (snapshot) => {
      setBuildings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Building)));
    });

    const unsubTickets = onSnapshot(collection(db, 'maintenance_tickets'), (snapshot) => {
      setTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceTicket)));
    });

    const unsubIncidents = onSnapshot(collection(db, 'incidents'), (snapshot) => {
      setIncidents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Incident)));
    });

    const unsubTenants = onSnapshot(collection(db, 'tenants'), (snapshot) => {
      setTenants(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tenant)));
    });

    const unsubRent = onSnapshot(collection(db, 'rent_records'), (snapshot) => {
      setRentRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RentRecord)));
    });

    return () => {
      unsubBuildings();
      unsubTickets();
      unsubIncidents();
      unsubTenants();
      unsubRent();
    };
  }, [user]);

  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login error:", error);
    }
  };

  const seedData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Add a building
      const buildingRef = await addDoc(collection(db, 'buildings'), {
        name: "Tower A - Addis Ababa",
        type: "mixed-use",
        address: "Bole Road, Addis Ababa",
        ownerId: user.uid,
        managerIds: [user.uid],
        unitCount: 50,
        occupancyRate: 0.85
      });

      // Add a tenant
      await addDoc(collection(db, 'tenants'), {
        name: "Abebe Kebede",
        companyName: "EthioTech Solutions",
        buildingId: buildingRef.id,
        unitId: "402",
        phone: "+251 911 223344",
        email: "abebe@example.com",
        leaseStart: "2024-01-01",
        leaseEnd: "2025-01-01",
        rentAmount: 25000,
        paymentStatus: "paid"
      });

      // Add a maintenance ticket
      await addDoc(collection(db, 'maintenance_tickets'), {
        buildingId: buildingRef.id,
        unitId: "402",
        category: "electrical",
        description: "Frequent power fluctuations in the office unit.",
        priority: "high",
        reportedBy: "Abebe Kebede",
        status: "new",
        createdAt: new Date().toISOString()
      });

      // Add an incident
      await addDoc(collection(db, 'incidents'), {
        buildingId: buildingRef.id,
        type: "generator-outage",
        severity: "critical",
        description: "Main backup generator failed to start during city power outage.",
        reportedAt: new Date().toISOString(),
        reportedBy: "Security Guard",
        status: "open",
        escalationLevel: 1
      });

      alert("Sample data seeded successfully!");
    } catch (error) {
      console.error("Error seeding data:", error);
      alert("Failed to seed data.");
    }
    setLoading(false);
  };

  const generateAiSummary = async () => {
    setIsAiLoading(true);
    const summary = await getOperationalSummary({
      buildings: buildings.length,
      tickets: tickets.filter(t => t.status !== 'closed').length,
      incidents: incidents.filter(i => i.status !== 'closed').length,
      tenants: tenants.length,
      overdueRent: rentRecords.filter(r => r.status === 'unpaid').length
    });
    setAiSummary(summary || 'No summary available.');
    setIsAiLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="text-emerald-500 animate-spin" size={48} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 p-8 rounded-3xl shadow-2xl">
          <div className="flex justify-center mb-8">
            <div className="p-4 bg-emerald-600 rounded-2xl shadow-lg shadow-emerald-600/20">
              <Building2 size={48} className="text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-white text-center mb-2">TowerPilot Ethiopia</h1>
          <p className="text-slate-400 text-center mb-8">AI-powered building operations copilot</p>
          <button
            onClick={handleLogin}
            className="w-full bg-white text-black font-bold py-4 rounded-2xl hover:bg-slate-100 transition-all flex items-center justify-center gap-3"
          >
            <img src="https://www.google.com/favicon.ico" className="w-5 h-5" alt="Google" />
            Sign in with Google
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-slate-200 flex">
      {/* Sidebar */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-50 w-72 bg-slate-950 border-r border-slate-900 transition-transform duration-300 transform ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-600 rounded-lg">
                <Building2 size={24} className="text-white" />
              </div>
              <span className="text-xl font-bold text-white tracking-tight">TowerPilot</span>
            </div>
            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-slate-400">
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 space-y-2">
            <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
            <SidebarItem icon={Building2} label="Buildings" active={activeTab === 'buildings'} onClick={() => setActiveTab('buildings')} />
            <SidebarItem icon={Users} label="Tenants" active={activeTab === 'tenants'} onClick={() => setActiveTab('tenants')} />
            <SidebarItem icon={Wrench} label="Maintenance" active={activeTab === 'maintenance'} onClick={() => setActiveTab('maintenance')} />
            <SidebarItem icon={AlertTriangle} label="Incidents" active={activeTab === 'incidents'} onClick={() => setActiveTab('incidents')} />
            <SidebarItem icon={CreditCard} label="Rent & Payments" active={activeTab === 'rent'} onClick={() => setActiveTab('rent')} />
            <SidebarItem icon={CheckSquare} label="Tasks" active={activeTab === 'tasks'} onClick={() => setActiveTab('tasks')} />
          </nav>

          <div className="mt-auto pt-6 border-t border-slate-900">
            <div className="flex items-center gap-3 mb-6 px-2">
              <img src={user.photoURL || ''} className="w-10 h-10 rounded-full border border-slate-800" alt="User" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white truncate">{user.displayName}</p>
                <p className="text-xs text-slate-500 truncate uppercase tracking-widest">{profile?.role}</p>
              </div>
            </div>
            <button
              onClick={() => signOut(auth)}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut size={20} />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-20 bg-slate-950/50 backdrop-blur-xl border-bottom border-slate-900 flex items-center justify-between px-8 sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden text-slate-400">
              <Menu size={24} />
            </button>
            <h2 className="text-xl font-bold text-white capitalize">{activeTab}</h2>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex items-center bg-slate-900 border border-slate-800 rounded-full px-4 py-2 w-64">
              <Search size={18} className="text-slate-500 mr-2" />
              <input type="text" placeholder="Search..." className="bg-transparent border-none outline-none text-sm text-white w-full" />
            </div>
            <button className="relative p-2 text-slate-400 hover:text-white transition-colors">
              <Bell size={22} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full border-2 border-slate-950"></span>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-8"
              >
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <StatCard label="Total Buildings" value={buildings.length} icon={Building2} color="bg-blue-600" />
                  <StatCard label="Active Tenants" value={tenants.length} icon={Users} color="bg-emerald-600" />
                  <StatCard label="Open Tickets" value={tickets.filter(t => t.status !== 'closed').length} icon={Wrench} color="bg-amber-600" />
                  <StatCard label="Urgent Incidents" value={incidents.filter(i => i.severity === 'critical' || i.severity === 'high').length} icon={AlertTriangle} color="bg-red-600" />
                </div>

                {/* AI Copilot Card */}
                <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
                  <div className="p-8 flex flex-col md:flex-row gap-8 items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-indigo-600 rounded-lg">
                          <MessageSquare size={20} className="text-white" />
                        </div>
                        <h3 className="text-xl font-bold text-white">AI Operations Copilot</h3>
                      </div>
                      <p className="text-slate-400 mb-6 leading-relaxed">
                        Get a real-time summary of your building operations, risks, and recommended actions.
                      </p>
                      {aiSummary ? (
                        <div className="bg-slate-950 border border-slate-800 p-6 rounded-2xl mb-6 whitespace-pre-wrap text-slate-300 font-medium leading-relaxed">
                          {aiSummary}
                        </div>
                      ) : null}
                      <div className="flex flex-wrap gap-4">
                        <button
                          onClick={generateAiSummary}
                          disabled={isAiLoading}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-xl transition-all flex items-center gap-2 disabled:opacity-50"
                        >
                          {isAiLoading ? <Loader2 size={20} className="animate-spin" /> : <Plus size={20} />}
                          {aiSummary ? 'Refresh Summary' : 'Generate Summary'}
                        </button>
                        {buildings.length === 0 && (
                          <button
                            onClick={seedData}
                            className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-3 rounded-xl transition-all flex items-center gap-2"
                          >
                            <Database size={20} />
                            Seed Sample Data
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="w-full md:w-80 bg-slate-950 border border-slate-800 p-6 rounded-2xl">
                      <h4 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">Quick Questions</h4>
                      <div className="space-y-3">
                        {[
                          "What needs attention today?",
                          "Any overdue rent?",
                          "Status of elevators?",
                          "Staff performance summary"
                        ].map((q, i) => (
                          <button key={i} className="w-full text-left p-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-sm text-slate-300 transition-colors flex items-center justify-between group">
                            {q}
                            <ChevronRight size={16} className="text-slate-600 group-hover:text-white transition-colors" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Recent Activity / Tables */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-white">Recent Maintenance</h3>
                      <button className="text-emerald-500 text-sm font-bold hover:underline">View All</button>
                    </div>
                    <div className="space-y-4">
                      {tickets.slice(0, 5).map(ticket => (
                        <div key={ticket.id} className="flex items-center gap-4 p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                          <div className={`p-2 rounded-lg ${
                            ticket.priority === 'urgent' ? 'bg-red-500/20 text-red-500' : 
                            ticket.priority === 'high' ? 'bg-amber-500/20 text-amber-500' : 'bg-blue-500/20 text-blue-500'
                          }`}>
                            <Wrench size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{ticket.description}</p>
                            <p className="text-xs text-slate-500">Unit {ticket.unitId} • {ticket.category}</p>
                          </div>
                          <div className="text-right">
                            <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full ${
                              ticket.status === 'resolved' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-400'
                            }`}>
                              {ticket.status}
                            </span>
                          </div>
                        </div>
                      ))}
                      {tickets.length === 0 && <p className="text-slate-500 text-center py-8">No maintenance tickets found.</p>}
                    </div>
                  </div>

                  <div className="bg-slate-900 border border-slate-800 rounded-3xl p-8">
                    <div className="flex items-center justify-between mb-6">
                      <h3 className="text-xl font-bold text-white">Urgent Incidents</h3>
                      <button className="text-emerald-500 text-sm font-bold hover:underline">View All</button>
                    </div>
                    <div className="space-y-4">
                      {incidents.slice(0, 5).map(incident => (
                        <div key={incident.id} className="flex items-center gap-4 p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                          <div className={`p-2 rounded-lg ${
                            incident.severity === 'critical' ? 'bg-red-600 text-white' : 'bg-red-500/20 text-red-500'
                          }`}>
                            <AlertTriangle size={20} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{incident.description}</p>
                            <p className="text-xs text-slate-500">{incident.type} • {new Date(incident.reportedAt).toLocaleDateString()}</p>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest">
                              {incident.severity}
                            </span>
                          </div>
                        </div>
                      ))}
                      {incidents.length === 0 && <p className="text-slate-500 text-center py-8">No urgent incidents found.</p>}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTab !== 'dashboard' && (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-full text-center"
              >
                <div className="p-6 bg-slate-900 rounded-3xl border border-slate-800 mb-6">
                  <Loader2 size={48} className="text-slate-700 animate-spin" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">{activeTab} Module</h3>
                <p className="text-slate-500 max-w-md">
                  This module is currently being initialized. The MVP core dashboard is active for your review.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
