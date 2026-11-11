'use strict';

const password = document.getElementById('password');
const toggle = document.querySelector('.password-toggle');
if (password && toggle) {
  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    const show = password.type === 'password';
    const start = password.selectionStart;
    const end = password.selectionEnd;
    password.type = show ? 'text' : 'password';
    toggle.setAttribute('aria-pressed', String(show));
    toggle.setAttribute('aria-label', show ? '비밀번호 숨기기' : '비밀번호 보기');
    password.focus();
    if (start !== null && end !== null) password.setSelectionRange(start, end);
  });
  password.form.addEventListener('submit', () => {
    password.type = 'password';
  });
}
