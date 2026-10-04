const greenhouse = require('./greenhouse');
const lever = require('./lever');
const workday = require('./workday');
const generic = require('./generic');

const ADAPTERS = [greenhouse, lever, workday];

function getSourceAdapter(hostname) {
  for (const adapter of ADAPTERS) {
    if (adapter.matches(hostname)) {
      return adapter;
    }
  }
  return null;
}

module.exports = {
  getSourceAdapter,
  generic
};
