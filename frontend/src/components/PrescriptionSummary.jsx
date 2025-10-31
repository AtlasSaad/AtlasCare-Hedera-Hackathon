import { FiPrinter, FiArrowLeft, FiCheckCircle } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';

const PrescriptionSummary = ({ prescription, onBack }) => {
  const navigate = useNavigate();

  const handlePrint = () => {
    window.print();
  };

  const handleDone = () => {
    navigate('/prescriptions');
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Prescription Created Successfully</h1>
          <p className="text-gray-600">Unique Prescription ID: {prescription.id}</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={onBack}
            className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <FiArrowLeft className="mr-2" /> Back
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
          >
            <FiPrinter className="mr-2" /> Print
          </button>
        </div>
      </div>

      <div className="border-b border-gray-200 pb-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-gray-900">Patient Information</h2>
            <p className="mt-1 text-sm text-gray-500">Details of the patient and prescription</p>
          </div>
          <div className="flex items-center text-green-600">
            <FiCheckCircle className="h-5 w-5 mr-1" />
            <span className="text-sm font-medium">Prescription Active</span>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Patient Name</h3>
            <p className="mt-1 text-sm text-gray-900">{prescription.patientName}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Patient ID</h3>
            <p className="mt-1 text-sm text-gray-900">{prescription.patientId}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Date of Birth</h3>
            <p className="mt-1 text-sm text-gray-900">{prescription.dob || 'N/A'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Date Prescribed</h3>
            <p className="mt-1 text-sm text-gray-900">
              {new Date(prescription.date).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Diagnosis</h3>
        <div className="bg-gray-50 p-4 rounded-md">
          <p className="text-sm text-gray-700">{prescription.diagnosis}</p>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Medications</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Medication
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Dosage
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Frequency
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Instructions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {prescription.medications.map((med, index) => (
                <tr key={index}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{med.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{med.dosage} {med.unit}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{med.frequency} times per day</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{med.duration} {med.durationUnit}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-900">{med.instructions || 'As directed'}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {prescription.notes && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                <span className="font-medium">Doctor's Notes:</span> {prescription.notes}
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
        <button
          type="button"
          onClick={handleDone}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          View All Prescriptions
        </button>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-container,
          .print-container * {
            visibility: visible;
          }
          .print-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};

export default PrescriptionSummary;
