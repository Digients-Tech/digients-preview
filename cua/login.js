(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  let lang = 'en', busy = false;
  try { lang = localStorage.getItem('digients-sample-language') === 'zh' ? 'zh' : 'en'; } catch {}
  const copy = {
    en: { hint: 'Enter the access password to explore the workflow sample.', label: 'Access password', enter: 'Enter', pending: 'Checking…', required: 'Enter the access password.', wrong: 'Wrong password. Try again.', failed: 'Could not connect. Try again.' },
    zh: { hint: '输入访问密码，查看工作流样本。', label: '访问密码', enter: '进入', pending: '验证中…', required: '请输入访问密码。', wrong: '密码错误，请重试。', failed: '暂时无法连接，请重试。' },
  };
  function render() {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
    $('login-hint').textContent = copy[lang].hint;
    $('password-label').textContent = copy[lang].label;
    $('login-submit').textContent = copy[lang][busy ? 'pending' : 'enter'];
    $('login-language').textContent = lang === 'en' ? '中文' : 'EN';
    $('login-language').setAttribute('aria-label', lang === 'en' ? '切换到中文' : 'Switch to English');
  }
  function error(key) {
    $('login-error').textContent = copy[lang][key];
    $('login-error').hidden = false;
    $('password').setAttribute('aria-invalid', 'true');
    $('password').setAttribute('aria-describedby', 'login-hint login-error');
    $('password').focus();
  }
  $('password').addEventListener('input', () => {
    $('login-error').hidden = true;
    $('password').removeAttribute('aria-invalid');
    $('password').setAttribute('aria-describedby', 'login-hint');
  });
  $('login-language').addEventListener('click', () => {
    lang = lang === 'en' ? 'zh' : 'en';
    try { localStorage.setItem('digients-sample-language', lang); } catch {}
    $('login-error').hidden = true;
    render();
  });
  $('login-form').addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    if (!$('password').value) return error('required');
    busy = true;
    $('login-submit').disabled = true;
    $('login-form').setAttribute('aria-busy', 'true');
    $('login-error').hidden = true;
    render();
    try {
      const response = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password: $('password').value }) });
      if (response.ok) { location.replace('/' + location.search + location.hash); return; }
      error(response.status === 401 ? 'wrong' : 'failed');
    } catch { error('failed'); }
    finally { busy = false; $('login-submit').disabled = false; $('login-form').removeAttribute('aria-busy'); render(); }
  });
  render();
})();
