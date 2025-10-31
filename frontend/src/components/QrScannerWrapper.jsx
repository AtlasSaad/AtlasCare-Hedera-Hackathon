import React, { useState, useEffect, useRef } from 'react';
import QrScanner from 'qr-scanner';

const QrScannerWrapper = ({ onDecode, onError, constraints = {}, containerStyle = {} }) => {
  const [error, setError] = useState(null);
  const [isSupported, setIsSupported] = useState(false);
  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);

  useEffect(() => {
    // Check if QR Scanner is supported
    const checkCamera = async () => {
      try {
        const hasCamera = await QrScanner.hasCamera();
        if (hasCamera) {
          setIsSupported(true);
        } else {
          setError('No camera detected on this device');
          if (onError) onError(new Error('No camera detected'));
        }
      } catch (err) {
        console.error('Camera check error:', err);
        setError('Camera access error: ' + err.message);
        if (onError) onError(err);
      }
    };

    checkCamera();
  }, [onError]);

  useEffect(() => {
    if (!isSupported || !videoRef.current) return;

    const startScanner = async () => {
      try {
        // Request camera permissions explicitly for mobile
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: constraints.facingMode || 'environment' } 
        });
        
        // Stop the stream immediately - QrScanner will handle it
        stream.getTracks().forEach(track => track.stop());

        // Create QR scanner instance
        const qrScanner = new QrScanner(
          videoRef.current,
          (result) => {
            console.log('QR Code detected:', result.data);
            if (onDecode) {
              onDecode(result.data);
            }
          },
          {
            highlightScanRegion: true,
            highlightCodeOutline: true,
            preferredCamera: constraints.facingMode === 'environment' ? 'environment' : 'user',
            maxScansPerSecond: 5,
          }
        );

        qrScannerRef.current = qrScanner;
        
        // Start scanning
        await qrScanner.start();
        console.log('QR Scanner started successfully');
        
      } catch (err) {
        console.error('QR Scanner error:', err);
        let errorMessage = 'Failed to start camera';
        
        if (err.name === 'NotAllowedError') {
          errorMessage = 'Camera access denied. Please allow camera permissions in your browser settings.';
        } else if (err.name === 'NotFoundError') {
          errorMessage = 'No camera found on this device.';
        } else if (err.name === 'NotReadableError') {
          errorMessage = 'Camera is already in use by another application.';
        } else if (err.message) {
          errorMessage = err.message;
        }
        
        setError(errorMessage);
        if (onError) onError(err);
      }
    };

    startScanner();

    return () => {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
      }
    };
  }, [isSupported, constraints, onDecode, onError]);

  const handleVideoClick = (event) => {
    // For testing purposes - simulate a QR scan
    const testQRData = JSON.stringify({
      topicID: "0.0.12345",
      hashedPatientId: "sha256:test123",
      signature: "hex:test456"
    });
    
    if (onDecode) {
      onDecode(testQRData);
    }
  };

  if (error) {
    const isHTTPSIssue = window.location.protocol === 'http:' && window.location.hostname !== 'localhost';
    
    return (
      <div className="p-4 text-sm text-red-700 bg-red-50 border-l-4 border-red-400 rounded">
        <p className="font-semibold">Camera Error</p>
        <p className="mb-2">{error}</p>
        
        {isHTTPSIssue && (
          <div className="mt-3 p-3 bg-yellow-50 border border-yellow-300 rounded text-yellow-800">
            <p className="font-semibold text-sm">⚠️ HTTPS Required for Camera</p>
            <p className="text-xs mt-1">
              Mobile browsers require HTTPS for camera access. Since you're accessing via local IP ({window.location.hostname}),
              camera access is blocked.
            </p>
            <p className="text-xs mt-2 font-semibold">Workaround:</p>
            <p className="text-xs">Enter the unique prescription ID manually instead of scanning.</p>
          </div>
        )}
        
        <button 
          onClick={() => window.location.reload()} 
          className="mt-3 px-3 py-1 bg-red-100 hover:bg-red-200 rounded text-sm"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!isSupported) {
    return (
      <div className="p-4 text-sm text-yellow-700 bg-yellow-50 border-l-4 border-yellow-400 rounded">
        <p className="font-semibold">Camera Not Supported</p>
        <p>Your browser doesn't support camera access. Please use a modern browser or enter the unique prescription ID manually.</p>
      </div>
    );
  }

  return (
    <div style={containerStyle} className="relative">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        onClick={handleVideoClick}
      />
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
          <div className="w-48 h-48 border-2 border-white border-dashed rounded-lg">
            <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-white"></div>
            <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-white"></div>
            <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-white"></div>
            <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-white"></div>
          </div>
        </div>
      </div>
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2">
        <p className="text-white text-sm bg-black bg-opacity-50 px-2 py-1 rounded">
          Point camera at QR code or click to test
        </p>
      </div>
    </div>
  );
};

export default QrScannerWrapper;
