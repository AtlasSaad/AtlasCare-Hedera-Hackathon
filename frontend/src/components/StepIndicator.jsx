import { FiCheck } from 'react-icons/fi';

/**
 * Enhanced Step Indicator Component
 * 
 * Features:
 * - Animated progress bar
 * - Checkmarks for completed steps
 * - Pulsing animation for current step
 * - Responsive design
 * 
 * Usage:
 *   <StepIndicator
 *     steps={['Create', 'Review', 'Success']}
 *     currentStep={1}
 *   />
 */

const StepIndicator = ({ steps = [], currentStep = 0, className = '' }) => {
  if (steps.length === 0) return null;
  
  return (
    <div className={`w-full ${className}`}>
      {/* Steps Container */}
      <div className="flex items-center justify-center">
          {steps.map((step, index) => {
            const stepNumber = index + 1;
            // Mark as completed if currentStep is past this step, OR if it's the last step and we're on it
            const isCompleted = currentStep > stepNumber || (currentStep === stepNumber && stepNumber === steps.length);
            const isCurrent = currentStep === stepNumber && !isCompleted;
            
            return (
              <div key={stepNumber} className="flex items-center">
                {/* Step Column */}
                <div className="flex flex-col items-center min-w-[140px]">
                  {/* Step Circle */}
                  <div className={`
                    w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg
                    transition-all duration-500 ease-out relative z-10 mb-3
                    ${isCompleted 
                      ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50 scale-110' 
                      : isCurrent
                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50 scale-110 animate-pulse-slow'
                        : 'bg-slate-200 text-slate-500'
                    }
                  `}>
                    {isCompleted ? (
                      <FiCheck className="w-6 h-6 animate-scale-in" />
                    ) : (
                      <span>{stepNumber}</span>
                    )}
                  </div>
                  
                  {/* Step Label */}
                  <span className={`
                    text-sm font-semibold transition-colors duration-300 text-center whitespace-nowrap
                    ${isCurrent || isCompleted 
                      ? 'text-emerald-600' 
                      : 'text-slate-500'
                    }
                  `}>
                    {step}
                  </span>
                </div>
                
                {/* Connector Line (skip for last step) */}
                {index < steps.length - 1 && (
                  <div className="flex items-start pt-0" style={{ width: '100px', marginTop: '-52px' }}>
                    <div className="w-full h-1 relative overflow-hidden rounded-full bg-slate-200">
                      <div 
                        className={`
                          absolute inset-y-0 left-0 bg-emerald-500 rounded-full
                          transition-all duration-700 ease-out
                        `}
                        style={{ 
                          width: currentStep > stepNumber ? '100%' : currentStep === stepNumber ? '100%' : '0%',
                          transitionDelay: currentStep > stepNumber ? `${index * 100}ms` : '0ms'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      
      {/* Progress Text */}
      <div className="text-center mt-6">
        <p className="text-sm text-slate-600">
          Step <span className="font-bold text-emerald-600">{currentStep}</span> of {steps.length}
        </p>
      </div>
    </div>
  );
};

export default StepIndicator;

