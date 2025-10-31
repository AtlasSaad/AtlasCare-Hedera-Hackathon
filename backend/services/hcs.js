const { drainQueue, isOnline, pruneExpired } = require('./store');

async function submitTopicMessage(topicId, messageBuffer) {
  // TODO: integrate Hedera SDK TopicMessageSubmitTransaction
  // For MVP, simulate success
  return true;
}

function queueSyncLoop() {
  setInterval(async () => {
    if (!isOnline()) return;
    await drainQueue((topicId, message) => submitTopicMessage(topicId, message));
    pruneExpired();
  }, 5000);
}

module.exports = {
  submitTopicMessage,
  queueSyncLoop
};


