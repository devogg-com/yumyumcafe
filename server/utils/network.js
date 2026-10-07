const os = require('os');

/**
 * Detect the primary LAN IPv4 address of this machine.
 * Ignores internal/loopback and virtual adapters where possible.
 */
function getLanIPv4() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    // Skip virtual or loopback adapters
    const isVirtual = /vethernet|vmware|virtual|loopback|pseudo/i.test(name);
    for (const net of interfaces[name]) {
      // IPv4 only, not internal
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push({
          name,
          address: net.address,
          isVirtual
        });
      }
    }
  }

  // Prioritize non-virtual physical adapter (e.g. Wi-Fi, Ethernet)
  const physical = addresses.find(a => !a.isVirtual);
  if (physical) {
    return physical.address;
  }

  if (addresses.length > 0) {
    return addresses[0].address;
  }

  return '127.0.0.1';
}

function getAllNetworkAddresses() {
  const interfaces = os.networkInterfaces();
  const result = [];

  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4') {
        result.push({
          interface: name,
          address: net.address,
          internal: net.internal
        });
      }
    }
  }

  return result;
}

module.exports = {
  getLanIPv4,
  getAllNetworkAddresses
};
