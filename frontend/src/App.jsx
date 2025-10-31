import { Routes, Route, Navigate, useLocation, useNavigate, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import useDocumentTitle from './hooks/useDocumentTitle';
import { 
  FiLogOut, 
  FiUser, 
  FiHome, 
  FiSearch, 
  FiCreditCard, 
  FiMenu, 
  FiPlus,
  FiActivity,
  FiUsers,
  FiSettings,
  FiCalendar,
  FiMessageSquare
} from 'react-icons/fi';
import { FaPills } from 'react-icons/fa';
import Login from './pages/Login';
import DoctorForm from './pages/DoctorForm';
import QRCodePage from './pages/QRCodePage';
import PharmacistLookup from './pages/PharmacistLookup';
import PaymentPage from './pages/PaymentPage';
import Dashboard from './pages/Dashboard';
import PrescriptionHistory from './pages/PrescriptionHistory';
import AdminDashboard from './pages/AdminDashboard';
import LanguageSwitcher from './components/LanguageSwitcher';
import './styles/tailwind.css';
import './styles/globals.css';

// Navigation component for the sidebar
const Navigation = ({ user, handleLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isActive = (path) => location.pathname === path;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  if (!user) return null;

  const navigation = [
    { name: 'Dashboard', href: '/', icon: FiHome, current: isActive('/') },
    { 
      name: 'New Prescription', 
      href: '/doctor', 
      icon: FiPlus, 
      current: isActive('/doctor'),
      roles: ['doctor']
    },
    { 
      name: 'Prescriptions', 
      href: '/prescriptions', 
      icon: FaPills, 
      current: isActive('/prescriptions'),
      roles: ['doctor']
    },
    { 
      name: 'Pharmacist', 
      href: '/pharmacist', 
      icon: FiSearch, 
      current: isActive('/pharmacist'),
      roles: ['pharmacist']
    },
    { 
      name: 'Payments', 
      href: '/payment', 
      icon: FiCreditCard, 
      current: isActive('/payment'),
      roles: ['pharmacist', 'admin']
    },
  ].filter(item => !item.roles || item.roles.includes(user.role));

  return (
    <>
      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <button
          type="button"
          className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500"
          onClick={() => setMobileMenuOpen(true)}
        >
          <span className="sr-only">Open main menu</span>
          <FiMenu className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 transform ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0 transition-transform duration-200 ease-in-out`}>
        <div className="flex h-full flex-col bg-white border-r border-gray-200">
          <div className="flex h-16 flex-shrink-0 items-center px-6 bg-gradient-to-r from-indigo-700 to-blue-700">
            <h1 className="text-xl font-bold text-white">Hedera Health</h1>
          </div>
          
          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto py-4 px-3">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md ${item.current ? 'bg-indigo-50 text-indigo-700' : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'}`}
                onClick={() => setMobileMenuOpen(false)}
              >
                <item.icon 
                  className={`mr-3 h-5 w-5 flex-shrink-0 ${item.current ? 'text-indigo-500' : 'text-gray-400 group-hover:text-gray-500'}`} 
                  aria-hidden="true" 
                />
                {item.name}
              </Link>
            ))}
          </nav>

          {/* User profile */}
          <div className="flex-shrink-0 border-t border-gray-200 p-4">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <FiUser className="h-8 w-8 rounded-full bg-gray-200 p-2 text-gray-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm font-medium text-gray-700">{user.email || user.role}</p>
                <p className="text-xs font-medium text-gray-500 capitalize">{user.role}</p>
              </div>
              <div className="ml-auto">
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                >
                  <FiLogOut className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Check if user is already logged in
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (error) {
        console.error('Failed to parse user data', error);
        localStorage.removeItem('user');
      }
    }
    setIsLoading(false);
  }, []);

  // Dynamic title based on current route
  useEffect(() => {
    const getPageTitle = () => {
      if (!user) return 'Sign In';
      
      const path = location.pathname;
      const searchParams = new URLSearchParams(location.search);
      
      // Handle specific routes with parameters
      if (path === '/pharmacist') {
        const topic = searchParams.get('topic');
        return topic ? `Verify Prescription ${topic}` : 'Pharmacist Portal';
      }
      if (path === '/prescription' && location.pathname.includes('/prescription/')) {
        return 'Prescription Details';
      }
      if (path === '/payment' && location.pathname.includes('/payment/')) {
        return 'Payment';
      }
      
      // Handle main routes
      switch (path) {
        case '/':
          return 'Dashboard';
        case '/doctor':
          return 'New Prescription';
        case '/prescriptions':
          return 'Prescription History';
        case '/pharmacist':
          return 'Pharmacist Portal';
        case '/payment':
          return 'Payment';
        default:
          return user.role === 'doctor' ? 'Doctor Portal' : 'Pharmacist Portal';
      }
    };
    
    const title = getPageTitle();
    document.title = title ? `${title} | AtlasCare` : 'AtlasCare';
  }, [location, user]);

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    navigate(userData.role === 'doctor' ? '/doctor' : '/pharmacist');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {user ? (
        user.role === 'doctor' ? (
          <div className="min-h-screen doctor-theme">
            {/* Clean header for doctor with gradient and logout on top-right */}
            <header className="sticky top-0 z-40 w-full header-surface">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img 
                    src="/Logo-V2.png" 
                    alt="AtlasCare" 
                    className="h-8 w-auto"
                    style={{ filter: 'brightness(1.0) contrast(1.0)' }}
                  />
                  <h1 className="text-base sm:text-lg md:text-xl font-extrabold tracking-tight doctor-title">
                    Welcome Doctor Rami
                  </h1>
                  <div className="flex items-center gap-1" title="Online">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-emerald-900/70 text-xs font-light">Online</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <LanguageSwitcher />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-emerald-900 bg-white/70 hover:bg-white border border-emerald-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    title="Logout"
                  >
                    <FiLogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            </header>

            {/* Main content without sidebar padding for doctor */}
            <main className="py-10">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/doctor" element={<DoctorForm />} />
                  <Route path="/prescriptions" element={<PrescriptionHistory />} />
                  <Route path="/pharmacist" element={<PharmacistLookup />} />
                  <Route path="/payment" element={<PaymentPage />} />
                  <Route path="/payment/:id" element={<PaymentPage />} />
                  <Route path="/prescription/:id" element={<QRCodePage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </main>
          </div>
        ) : user.role === 'pharmacist' ? (
          <div className="min-h-screen pharma-theme">
            {/* Clean header for pharmacist with gradient and logout on top-right */}
            <header className="sticky top-0 z-40 w-full header-surface">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img 
                    src="/Logo-V2.png" 
                    alt="AtlasCare" 
                    className="h-8 w-auto"
                    style={{ filter: 'brightness(1.0) contrast(1.0)' }}
                  />
                  <h1 className="text-base sm:text-lg md:text-xl font-extrabold tracking-tight pharma-title">
                    Welcome Mr Alami
                  </h1>
                  <div className="flex items-center gap-1" title="Online">
                    <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-slate-800/70 text-xs font-light">Online</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <LanguageSwitcher />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    title="Logout"
                  >
                    <FiLogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            </header>

            {/* Main content without sidebar padding for pharmacist */}
            <main className="py-10">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                <Routes>
                  <Route path="/" element={<Dashboard />} />
                  <Route path="/doctor" element={<DoctorForm />} />
                  <Route path="/prescriptions" element={<PrescriptionHistory />} />
                  <Route path="/pharmacist" element={<PharmacistLookup />} />
                  <Route path="/payment" element={<PaymentPage />} />
                  <Route path="/payment/:id" element={<PaymentPage />} />
                  <Route path="/prescription/:id" element={<QRCodePage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </div>
            </main>
          </div>
        ) : user.role === 'admin' ? (
          <div className="min-h-screen bg-gray-50">
            {/* Header for admin */}
            <header className="sticky top-0 z-40 w-full bg-white border-b border-gray-200 shadow-sm">
              <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img 
                    src="/Logo-V2.png" 
                    alt="AtlasCare" 
                    className="h-8 w-auto"
                    style={{ filter: 'brightness(1.0) contrast(1.0)' }}
                  />
                  <h1 className="text-lg font-bold text-gray-900">
                    AtlasCare Admin Dashboard
                  </h1>
                </div>
                <div className="flex items-center gap-3">
                  <LanguageSwitcher />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    title="Logout"
                  >
                    <FiLogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            </header>

            {/* Main content for admin */}
            <main className="py-10">
              <Routes>
                <Route path="/" element={<AdminDashboard />} />
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Routes>
            </main>
          </div>
        ) : (
          <>
            <Navigation user={user} handleLogout={handleLogout} />
            
            {/* Main content with sidebar padding */}
            <div className="lg:pl-64">
              {/* Overlay for mobile menu */}
              {mobileMenuOpen && (
                <div 
                  className="fixed inset-0 z-30 bg-black bg-opacity-50 lg:hidden"
                  onClick={() => setMobileMenuOpen(false)}
                />
              )}
              
              <main className="py-10">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/doctor" element={<DoctorForm />} />
                    <Route path="/prescriptions" element={<PrescriptionHistory />} />
                    <Route path="/pharmacist" element={<PharmacistLookup />} />
                    <Route path="/payment" element={<PaymentPage />} />
                    <Route path="/payment/:id" element={<PaymentPage />} />
                    <Route path="/prescription/:id" element={<QRCodePage />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Routes>
                </div>
              </main>
            </div>
          </>
        )
      ) : (
        <Routes>
          <Route path="/" element={<Login onLogin={handleLogin} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      )}
    </div>
  );
}

export default App;
