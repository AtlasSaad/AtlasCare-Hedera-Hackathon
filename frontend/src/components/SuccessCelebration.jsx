import { FiCheckCircle, FiCopy, FiFileText } from 'react-icons/fi';
import { useState } from 'react';
import QRCodeDisplay from './QRCodeDisplay';

/**
 * Success Celebration Component
 * 
 * Displays after prescription creation with:
 * - Animated checkmark
 * - Key metrics
 * - Quick actions
 * - Confetti-style celebration
 * 
 * Usage:
 *   <SuccessCelebration
 *     topicId="0.0.7153833"
 *     prescriptionId="RX-20251029-001"
 *     dispenses="0/12"
 *     submissionTime={245}
 *     onCreateAnother={() => {}}
 *     onViewHistory={() => {}}
 *   />
 */

const SuccessCelebration = ({
  topicId,
  prescriptionId,
  dispenses,
  submissionTime,
  qrImage,
  qrData,
  onCreateAnother,
  onViewHistory,
  onDownload,
  onEmail,
  onPrint,
  onRevoke
}) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(topicId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto animate-fade-in">
      {/* Celebration Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br from-emerald-100 to-teal-100 mb-6 animate-scale-in shadow-xl shadow-emerald-500/20">
          <FiCheckCircle className="w-20 h-20 text-emerald-600" />
        </div>
        <h2 className="text-5xl font-extrabold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent mb-4">
          Prescription Created!
        </h2>
        <p className="text-xl text-slate-600">
          Secured on Hedera blockchain in{' '}
          <span className="font-bold text-emerald-600">{submissionTime}ms</span>
        </p>
      </div>
      
      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <div className="bg-white rounded-2xl p-6 text-center border border-blue-200 shadow-lg hover:shadow-xl transition-all hover:scale-105">
          <div className="text-xs text-blue-600 font-bold mb-3 uppercase tracking-wider">
            Unique Prescription ID
          </div>
          <div className="text-base font-mono font-bold text-blue-900 break-all mb-3">
            {topicId}
          </div>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-all"
          >
            <FiCopy className="w-4 h-4" />
            {copied ? 'Copied!' : 'Copy ID'}
          </button>
        </div>
        
        <div className="bg-white rounded-2xl p-6 text-center border border-emerald-200 shadow-lg hover:shadow-xl transition-all hover:scale-105">
          <div className="text-xs text-emerald-600 font-bold mb-3 uppercase tracking-wider">
            Dispenses
          </div>
          <div className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
            {dispenses}
          </div>
          <div className="text-sm text-emerald-600 font-medium mt-2">
            Remaining
          </div>
        </div>
        
        <div className="bg-white rounded-2xl p-6 text-center border border-purple-200 shadow-lg hover:shadow-xl transition-all hover:scale-105">
          <div className="text-xs text-purple-600 font-bold mb-3 uppercase tracking-wider">
            Security
          </div>
          <div className="text-2xl font-bold text-purple-900 mb-1">
            ✓ ECDSA
          </div>
          <div className="text-sm text-purple-600 font-medium">
            Signed & Verified
          </div>
        </div>
      </div>
      
      {/* QR Code Card */}
      {(qrImage || qrData) && (
        <div className="bg-white rounded-2xl shadow-xl ring-1 ring-slate-900/5 p-8 mb-6">
          <h3 className="text-lg font-bold text-slate-900 mb-4 text-center">
            Prescription QR Code
          </h3>
          <div className="flex justify-center mb-6">
            {qrImage ? (
              <div className="p-4 bg-white rounded-xl ring-1 ring-slate-200">
                <img 
                  src={qrImage} 
                  alt="Prescription QR Code" 
                  className="w-64 h-64"
                />
              </div>
            ) : qrData ? (
              <QRCodeDisplay 
                value={qrData}
                size={256}
                level="H"
                includeMargin={true}
                showPayload={false}
                onDownload={onDownload}
                onPrint={onPrint}
                onRevoke={onRevoke}
              />
            ) : null}
          </div>
        </div>
      )}
      
      {/* Next Actions */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        {onCreateAnother && (
          <button 
            onClick={onCreateAnother}
            className="flex-1 inline-flex items-center justify-center gap-2 px-8 py-5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-lg font-bold rounded-2xl hover:from-emerald-500 hover:to-teal-500 transition-all shadow-xl shadow-emerald-500/30 hover:scale-105"
          >
            Create Another Prescription
          </button>
        )}
        
        {onViewHistory && (
          <button 
            onClick={onViewHistory}
            className="sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-5 bg-white text-slate-700 text-lg font-bold rounded-2xl hover:bg-slate-50 transition-all ring-2 ring-slate-300 hover:ring-emerald-500 hover:scale-105"
          >
            View History
          </button>
        )}
      </div>
      
      {/* Success Note */}
      <div className="p-6 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl border-2 border-emerald-200 shadow-lg">
        <div className="flex items-start justify-center gap-3 text-base text-emerald-900">
          <FiFileText className="w-6 h-6 text-emerald-600 flex-shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <span className="font-bold text-emerald-700">Success!</span> This prescription is now immutably recorded on Hedera blockchain
            and can be verified by any pharmacy in Morocco.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SuccessCelebration;

