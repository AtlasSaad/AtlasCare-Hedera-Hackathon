import { FiDownload, FiPrinter, FiXCircle } from 'react-icons/fi';
import QRCode from 'qrcode.react';

const QRCodeDisplay = ({ 
  value, 
  size = 128, 
  level = 'M', 
  includeMargin = true, 
  renderAs = 'canvas', 
  showPayload = false,
  onDownload,
  onPrint,
  onRevoke
}) => {
  return (
    <div className="relative inline-block">
      {/* QR Code with gradient border */}
      <div className="p-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl shadow-xl border-2 border-emerald-100">
        <div className="bg-white p-4 rounded-xl shadow-inner">
          <QRCode 
            value={value}
            size={size}
            level={level}
            includeMargin={includeMargin}
            renderAs={renderAs}
            className="mx-auto"
          />
        </div>
        
        {/* Action buttons */}
        <div className="mt-4 grid grid-cols-3 gap-2">
          {onDownload && (
            <button
              onClick={onDownload}
              className="flex flex-col items-center justify-center gap-1 px-3 py-2 bg-white border border-emerald-200 rounded-lg text-xs font-medium text-emerald-700 hover:bg-emerald-50 transition-colors"
            >
              <FiDownload className="h-4 w-4" />
              <span>Download</span>
            </button>
          )}
          
          {onPrint && (
            <button
              onClick={onPrint}
              className="flex flex-col items-center justify-center gap-1 px-3 py-2 bg-white border border-blue-200 rounded-lg text-xs font-medium text-blue-700 hover:bg-blue-50 transition-colors"
            >
              <FiPrinter className="h-4 w-4" />
              <span>Print</span>
            </button>
          )}
          
          {onRevoke && (
            <button
              onClick={onRevoke}
              className="flex flex-col items-center justify-center gap-1 px-3 py-2 bg-white border border-red-200 rounded-lg text-xs font-medium text-red-700 hover:bg-red-50 transition-colors"
            >
              <FiXCircle className="h-4 w-4" />
              <span>Revoke</span>
            </button>
          )}
        </div>
      </div>
      
      {/* Only show payload if explicitly requested */}
      {showPayload && (
        <div className="mt-3 text-xs text-center text-gray-500 break-all max-w-xs">
          {value.length > 40 ? `${value.substring(0, 20)}...${value.substring(value.length - 20)}` : value}
        </div>
      )}
    </div>
  );
};

export default QRCodeDisplay;
