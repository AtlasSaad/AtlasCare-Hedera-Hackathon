const axios = require('axios');

/**
 * Send SMS via Infobip API
 * @param {String} to - Phone number with country code (e.g., +212612345678)
 * @param {String} message - SMS text content
 * @returns {Promise<Object>} - { success, messageId, error }
 */
async function sendSMS(to, message) {
  try {
    const apiKey = process.env.INFOBIP_API_KEY;
    const baseUrl = process.env.INFOBIP_BASE_URL || 'https://api.infobip.com';
    const from = process.env.INFOBIP_SMS_FROM || 'AtlasCare';

    if (!apiKey) {
      console.warn('Infobip API key not configured, skipping SMS');
      return { success: false, error: 'SMS not configured' };
    }

    // Ensure phone number has + prefix
    const phoneNumber = to.startsWith('+') ? to : `+${to}`;

    const response = await axios.post(
      `${baseUrl}/sms/2/text/advanced`,
      {
        messages: [
          {
            from: from,
            destinations: [
              {
                to: phoneNumber
              }
            ],
            text: message
          }
        ]
      },
      {
        headers: {
          'Authorization': `App ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    if (response.data && response.data.messages && response.data.messages.length > 0) {
      const msg = response.data.messages[0];
      if (msg.status && msg.status.groupId === 1) {
        // Group 1 = PENDING (message accepted)
        console.log(`SMS sent successfully to ${phoneNumber}:`, msg.messageId);
        return { success: true, messageId: msg.messageId };
      } else {
        console.warn(`SMS failed for ${phoneNumber}:`, msg.status);
        return { success: false, error: msg.status?.description || 'SMS delivery failed' };
      }
    }

    return { success: false, error: 'No response from Infobip' };
  } catch (error) {
    console.error('SMS sending error:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send WhatsApp message via Infobip API
 * @param {String} to - Phone number with country code (e.g., +212612345678)
 * @param {String} message - WhatsApp text content
 * @returns {Promise<Object>} - { success, messageId, error }
 */
async function sendWhatsApp(to, message) {
  try {
    const apiKey = process.env.INFOBIP_API_KEY;
    const baseUrl = process.env.INFOBIP_BASE_URL || 'https://api.infobip.com';
    const from = process.env.INFOBIP_WHATSAPP_FROM;

    if (!apiKey || !from) {
      console.warn('Infobip WhatsApp not configured, skipping WhatsApp');
      return { success: false, error: 'WhatsApp not configured' };
    }

    // Ensure phone number has + prefix
    const phoneNumber = to.startsWith('+') ? to : `+${to}`;

    const response = await axios.post(
      `${baseUrl}/whatsapp/1/message/text`,
      {
        from: from,
        to: phoneNumber,
        content: {
          text: message
        }
      },
      {
        headers: {
          'Authorization': `App ${apiKey}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    if (response.data && response.data.status) {
      if (response.data.status.groupId === 1) {
        // Group 1 = PENDING (message accepted)
        console.log(`WhatsApp sent successfully to ${phoneNumber}:`, response.data.messageId);
        return { success: true, messageId: response.data.messageId };
      } else {
        console.warn(`WhatsApp failed for ${phoneNumber}:`, response.data.status);
        return { success: false, error: response.data.status?.description || 'WhatsApp delivery failed' };
      }
    }

    return { success: false, error: 'No response from Infobip' };
  } catch (error) {
    console.error('WhatsApp sending error:', error.response?.data || error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Send message via appropriate channel (SMS or WhatsApp)
 * @param {Object} options - { to, message, method }
 * @param {String} options.to - Phone number with country code
 * @param {String} options.message - Message content
 * @param {String} options.method - 'sms' or 'whatsapp'
 * @returns {Promise<Object>} - { success, messageId, error, method }
 */
async function sendMessage({ to, message, method = 'sms' }) {
  if (!to || !message) {
    return { success: false, error: 'Missing phone number or message', method };
  }

  const methodLower = (method || 'sms').toLowerCase();

  if (methodLower === 'whatsapp') {
    const result = await sendWhatsApp(to, message);
    return { ...result, method: 'whatsapp' };
  } else if (methodLower === 'sms') {
    const result = await sendSMS(to, message);
    return { ...result, method: 'sms' };
  } else {
    return { success: false, error: `Unknown method: ${method}`, method };
  }
}

/**
 * Send prescription notification via configured method
 * @param {Object} options - Notification options
 * @param {String} options.to - Phone number
 * @param {String} options.topicID - Prescription topic ID
 * @param {String} options.patientName - Patient name
 * @param {String} options.method - 'sms' or 'whatsapp'
 * @returns {Promise<Object>}
 */
async function sendPrescriptionNotification({ to, topicID, patientName, method = 'sms' }) {
  const message = `Dear ${patientName || 'Patient'},\n\nYour AtlasCare prescription is ready.\nPrescription code: ${topicID}\n\nShow this code at the pharmacy to collect your medication.\n\n- AtlasCare Team`;

  // Try the requested method first
  const result = await sendMessage({ to, message, method });
  
  // If WhatsApp fails, automatically fallback to SMS
  if (!result.success && method.toLowerCase() === 'whatsapp') {
    console.warn('WhatsApp failed, falling back to SMS...');
    const smsResult = await sendMessage({ to, message, method: 'sms' });
    return { ...smsResult, fallback: true, originalMethod: 'whatsapp' };
  }
  
  return result;
}

module.exports = {
  sendSMS,
  sendWhatsApp,
  sendMessage,
  sendPrescriptionNotification
};

