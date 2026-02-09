import { ref, onMounted, onUnmounted } from 'vue';

export function usePolling(
  fn: () => Promise<void>,
  intervalMs: number,
  options: { immediate?: boolean } = {}
) {
  const { immediate = true } = options;
  const isPolling = ref(false);
  let timer: ReturnType<typeof setInterval> | null = null;

  function start() {
    if (isPolling.value) return;
    isPolling.value = true;
    timer = setInterval(fn, intervalMs);
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
    isPolling.value = false;
  }

  async function execute() {
    await fn();
  }

  onMounted(() => {
    if (immediate) {
      fn(); // Run once immediately
      start();
    }
  });

  onUnmounted(() => {
    stop();
  });

  return { isPolling, start, stop, execute };
}
