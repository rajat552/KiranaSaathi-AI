import { MongoMemoryServer } from 'mongodb-memory-server';

async function download() {
  console.log('Downloading MongoDB binary for MongoMemoryServer...');
  const server = await MongoMemoryServer.create();
  console.log('MongoDB server started at URI:', server.getUri());
  await server.stop();
  console.log('MongoDB binary successfully downloaded and cached!');
}

download().catch(err => {
  console.error('Download failed:', err);
  process.exit(1);
});
