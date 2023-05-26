export function mining(privateKey, event, difficulty = 0) {
  return new Promise((resolve, reject) => {
    const worker = new Worker("./power_worker.js", { type: "module" });
    event = JSON.parse(JSON.stringify(event));
    worker.onmessage = ({ data }) => resolve(data);
    worker.onerror = ({ error }) => reject(error);
    worker.postMessage({ privateKey, event, difficulty: Number(difficulty) });
  });
}
