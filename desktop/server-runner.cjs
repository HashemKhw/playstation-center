try {
  require('./server-bundle.cjs');
} catch (error) {
  console.error(error);
  process.exit(1);
}
