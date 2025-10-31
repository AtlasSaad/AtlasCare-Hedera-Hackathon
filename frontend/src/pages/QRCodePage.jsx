import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import QRCodeDisplay from '../components/QRCodeDisplay';

const QRCodePage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [prescriptionData, setPrescriptionData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const data = params.get('data');
    
    if (data) {
      try {
        const decodedData = JSON.parse(decodeURIComponent(data));
        setPrescriptionData(decodedData);
      } catch (error) {
        console.error('Error parsing prescription data:', error);
        navigate('/doctor');
      }
    } else {
      navigate('/doctor');
    }
  }, [location, navigate]);

  const copyToClipboard = () => {
    if (!prescriptionData) return;
    navigator.clipboard.writeText(prescriptionData.prescriptionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!prescriptionData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading prescription details...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Prescription Created Successfully
            </h3>
            <div className="mt-1 flex items-center">
              <p className="max-w-2xl text-sm text-gray-500">
                Unique Prescription ID: {prescriptionData.prescriptionId}
              </p>
              <button
                onClick={copyToClipboard}
                className="ml-2 text-blue-600 hover:text-blue-800 text-sm font-medium"
                title="Copy to clipboard"
              >
                {copied ? 'Copied!' : 'Copy'}
              </button>
            </div>
          </div>
          
          <div className="border-t border-gray-200 px-4 py-5 sm:px-6">
            <div className="flex flex-col items-center justify-center space-y-6">
              <div className="text-center">
                <h4 className="text-lg font-medium text-gray-900">Verification QR Code</h4>
                <p className="text-sm text-gray-500 mt-1">Scan to verify this prescription</p>
                <div className="mt-4 p-4 bg-white rounded-lg border border-gray-200 inline-block">
                  <QRCodeDisplay 
                    value={JSON.stringify(prescriptionData.qr?.data || { topicID: '0.0.0', hashedPatientId: 'unknown' })} 
                    size={200}
                    level="M"
                    includeMargin={true}
                  />
                </div>
              </div>
              
              <div className="w-full mt-8">
                <h4 className="text-lg font-medium text-gray-900 mb-4">Prescription Details</h4>
                <div className="bg-gray-50 p-6 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h5 className="text-sm font-medium text-gray-500">Patient Information</h5>
                      <dl className="mt-2 space-y-2">
                        <div>
                          <dt className="text-xs text-gray-500">Name</dt>
                          <dd className="text-sm font-medium text-gray-900">
                            {prescriptionData.patientName}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Date</dt>
                          <dd className="text-sm text-gray-900">
                            {new Date(prescriptionData.date).toLocaleDateString()}
                          </dd>
                        </div>
                      </dl>
                    </div>
                    
                    <div>
                      <h5 className="text-sm font-medium text-gray-500">Prescriber</h5>
                      <dl className="mt-2 space-y-2">
                        <div>
                          <dt className="text-xs text-gray-500">Doctor</dt>
                          <dd className="text-sm font-medium text-gray-900">
                            {prescriptionData.doctor || 'Dr. Smith'}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-gray-500">Unique Prescription ID</dt>
                          <dd className="text-sm font-mono text-gray-900">
                            {prescriptionData.prescriptionId}
                          </dd>
                        </div>
                      </dl>
                    </div>
                  </div>
                  
                  <div className="mt-8">
                    <h5 className="text-sm font-medium text-gray-500 mb-3">
                      Prescribed Medications
                    </h5>
                    <div className="space-y-3">
                      {prescriptionData.medications && prescriptionData.medications.map((med, index) => (
                        <div key={index} className="bg-white p-4 rounded-md shadow-sm border border-gray-100">
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="font-medium text-gray-900">{med.name}</h4>
                              <p className="text-sm text-gray-600 mt-1">
                                {med.dosage} {med.unit} • {med.frequency} time(s) per day • {med.duration} {med.durationUnit}
                              </p>
                            </div>
                            {med.code && (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {med.code}
                              </span>
                            )}
                          </div>
                          {med.instructions && (
                            <div className="mt-2 pt-2 border-t border-gray-100">
                              <p className="text-xs text-gray-600">
                                <span className="font-medium">Instructions:</span> {med.instructions}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="w-full mt-6 space-y-3">
                <button
                  onClick={() => window.print()}
                  className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print Prescription
                </button>
                <button
                  onClick={() => navigate('/doctor')}
                  className="w-full flex justify-center items-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Back to Dashboard
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QRCodePage;
