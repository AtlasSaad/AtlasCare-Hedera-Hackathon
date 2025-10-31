import { FiAlertCircle, FiCheckCircle, FiInfo, FiXCircle, FiX } from 'react-icons/fi';

const variants = {
  success: {
    container: 'bg-green-50 border-green-200 text-green-800',
    icon: FiCheckCircle,
    iconColor: 'text-green-600',
  },
  error: {
    container: 'bg-red-50 border-red-200 text-red-800',
    icon: FiXCircle,
    iconColor: 'text-red-600',
  },
  warning: {
    container: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    icon: FiAlertCircle,
    iconColor: 'text-yellow-600',
  },
  info: {
    container: 'bg-blue-50 border-blue-200 text-blue-800',
    icon: FiInfo,
    iconColor: 'text-blue-600',
  },
};

const Alert = ({ 
  children, 
  variant = 'info', 
  title, 
  onClose, 
  action,
  className = '' 
}) => {
  const config = variants[variant] || variants.info;
  const Icon = config.icon;
  
  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl border ${config.container} ${className}`}>
      <Icon className={`h-5 w-5 flex-shrink-0 ${config.iconColor} mt-0.5`} />
      <div className="flex-1">
        {title && (
          <h4 className="text-sm font-semibold mb-1">{title}</h4>
        )}
        <div className="text-sm">{children}</div>
        {action && (
          <div className="mt-3">
            {action}
          </div>
        )}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className={`flex-shrink-0 ${config.iconColor} hover:opacity-70 transition-opacity`}
        >
          <FiX className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

export default Alert;

