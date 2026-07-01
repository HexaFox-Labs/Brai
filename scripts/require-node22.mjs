const version = process.versions.node.split(".").map(Number);

if (version[0] < 22) {
  console.error(
    `Brai requires Node.js >=22.0.0. Current: ${process.version}. Use /srv/opt/node-v22.16.0/bin.`,
  );
  process.exit(1);
}
