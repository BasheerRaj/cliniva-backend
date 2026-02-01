export default async function globalTeardown() {
  const instance = (global as any).__MONGOINSTANCE;
  if (instance) {
    await instance.stop();
  }
}
