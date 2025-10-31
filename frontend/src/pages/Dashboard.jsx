import { Link } from 'react-router-dom';
import { 
  FiActivity, 
  FiSearch, 
  FiCreditCard, 
  FiUsers,
  FiCalendar,
  FiMessageSquare,
  FiPhoneCall
} from 'react-icons/fi';
import { FaPills } from 'react-icons/fa';

const stats = [
  { name: 'Total Patients', value: '2,420', change: '+12%', changeType: 'increase', icon: FiActivity },
  { name: 'Active Prescriptions', value: '1,210', change: '+5.4%', changeType: 'increase', icon: FaPills },
  { name: 'Pending Approvals', value: '8', change: '-1.2%', changeType: 'decrease', icon: FiCreditCard },
  { name: 'Total Revenue', value: '$45,231', change: '+19.8%', changeType: 'increase', icon: FiUsers },
];

const recentActivity = [
  { id: 1, user: 'John Doe', action: 'created a new prescription', time: '2m ago', icon: FaPills },
  { id: 2, user: 'Jane Smith', action: 'updated patient records', time: '1h ago', icon: FiUsers },
  { id: 3, user: 'Dr. Sarah Johnson', action: 'requested a consultation', time: '3h ago', icon: FiPhoneCall },
  { id: 4, user: 'System', action: 'scheduled maintenance', time: '1d ago', icon: FiActivity },
];

const quickActions = [
  { name: 'New Prescription', icon: FaPills, href: '/doctor', color: 'bg-blue-100 text-blue-600' },
  { name: 'Patient Lookup', icon: FiSearch, href: '/pharmacist', color: 'bg-green-100 text-green-600' },
  { name: 'Schedule Appointment', icon: FiCalendar, href: '#', color: 'bg-purple-100 text-purple-600' },
  { name: 'Send Message', icon: FiMessageSquare, href: '#', color: 'bg-yellow-100 text-yellow-600' },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
          <p className="mt-1 text-sm text-gray-500">Welcome back! Here's what's happening with your patients today.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <stat.icon className="h-6 w-6 text-gray-400" aria-hidden="true" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">{stat.name}</dt>
                    <dd>
                      <div className="text-lg font-medium text-gray-900">{stat.value}</div>
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="text-sm">
                <span className={`font-medium ${
                  stat.changeType === 'increase' ? 'text-green-600' : 'text-red-600'
                }`}>
                  {stat.change}
                </span>{' '}
                <span className="text-gray-500">vs last month</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Quick Actions */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-5">
              <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
              <p className="mt-1 text-sm text-gray-500">Frequently used actions</p>
            </div>
            <div className="border-t border-gray-200 px-5 py-3 space-y-3">
              {quickActions.map((action) => (
                <Link
                  key={action.name}
                  to={action.href}
                  className="group flex items-center p-3 -mx-3 rounded-md hover:bg-gray-50 transition-colors duration-150"
                >
                  <span className={`${action.color} p-2 rounded-md`}>
                    <action.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="ml-3 text-sm font-medium text-gray-700 group-hover:text-gray-900">
                    {action.name}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="p-5">
              <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
              <p className="mt-1 text-sm text-gray-500">Latest actions in the system</p>
            </div>
            <div className="border-t border-gray-200 px-5 py-3">
              <ul className="divide-y divide-gray-200">
                {recentActivity.map((item) => (
                  <li key={item.id} className="py-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <item.icon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                      </div>
                      <div className="ml-3 flex-1">
                        <p className="text-sm text-gray-900">
                          <span className="font-medium">{item.user}</span> {item.action}
                        </p>
                        <p className="text-sm text-gray-500">{item.time}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
              <div className="mt-4 text-center">
                <button
                  type="button"
                  className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                >
                  View all activity
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
