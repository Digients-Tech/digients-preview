(() => {
  'use strict';
  let expired = false;
  async function check() {
    if (expired || document.hidden) return;
    try {
      const response = await fetch('/api/session', { cache: 'no-store' });
      if (response.ok && !(await response.json()).authed) {
        expired = true;
        document.querySelectorAll('video, audio').forEach(media => media.pause());
        location.reload();
      }
    } catch { /* The next check retries after a temporary connection failure. */ }
  }
  document.getElementById('sign-out').addEventListener('click', async event => {
    event.currentTarget.disabled = true;
    try {
      const response = await fetch('/api/logout', { method: 'POST' });
      if (!response.ok) throw new Error('Sign out failed');
      location.reload();
    } catch {
      const error = document.getElementById('session-error');
      error.textContent = document.documentElement.lang.startsWith('zh') ? '退出失败，请重试。' : 'Could not sign out. Try again.';
      error.hidden = false;
      document.getElementById('sign-out').disabled = false;
    }
  });
  addEventListener('pageshow', check);
  document.addEventListener('visibilitychange', check);
  setInterval(check, 60000);
})();
