/* as-ulikeit.com — resilient inquiry form sender
 * Why this exists: formsubmit.co has been returning Cloudflare 521 (origin down)
 * since 2026-10-29, which silently killed lead capture on all 21 pages.
 * This wraps every form.inq: try the endpoint, and if it fails for ANY reason,
 * hand the visitor a prefilled email instead of a dead form.
 * Plain ES5, no dependencies. Loaded with defer.
 */
(function () {
  var ENDPOINT = 'https://formsubmit.co/ajax/djbenthomas@gmail.com';
  var MAILTO_TO = 'djbenthomas@gmail.com';
  var FALLBACK_SUBJECT = 'Booking inquiry — as-ulikeit.com';
  var FALLBACK_SMS = 'sms:6615330100';
  var PHONE_DISPLAY = '661-533-0100';
  var TIMEOUT_MS = 9000;
  var SKIP = { _subject: 1, _template: 1, _captcha: 1, _honey: 1, _next: 1, _replyto: 1, _cc: 1 };

  function humanize(key) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, function (c) { return c.toUpperCase(); });
  }

  function collect(form) {
    var out = [];
    var els = form.elements;
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      if (!el.name || SKIP[el.name]) continue;
      if (el.type === 'checkbox') { if (el.checked) out.push([humanize(el.name), el.value]); continue; }
      if (el.type === 'submit' || el.type === 'button') continue;
      var val = (el.value || '').trim();
      if (val) out.push([humanize(el.name), val]);
    }
    return out;
  }

  function toObject(pairs) {
    var o = {};
    for (var i = 0; i < pairs.length; i++) {
      var k = pairs[i][0], v = pairs[i][1];
      o[k] = o[k] ? o[k] + ', ' + v : v;
    }
    return o;
  }

  function txt(pairs) {
    var lines = [];
    for (var i = 0; i < pairs.length; i++) lines.push(pairs[i][0] + ': ' + pairs[i][1]);
    return lines.join('\n');
  }

  function statusEl(form) {
    var el = form.querySelector('.inq-status');
    if (!el) {
      el = document.createElement('p');
      el.className = 'inq-status';
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'polite');
      el.style.cssText = 'margin-top:14px;font-size:14px;line-height:1.5;text-align:center;';
      var btn = form.querySelector('button[type="submit"]');
      if (btn && btn.parentNode) btn.parentNode.insertBefore(el, btn.nextSibling);
      else form.appendChild(el);
    }
    return el;
  }

  function say(form, msg, tone) {
    var el = statusEl(form);
    el.style.color = tone === 'err' ? '#F3C0A8' : (tone === 'ok' ? '#F5E3BE' : '');
    el.textContent = msg;
  }

  function lock(form, on, label) {
    var btn = form.querySelector('button[type="submit"]');
    if (!btn) return;
    if (!btn.getAttribute('data-idle-label')) btn.setAttribute('data-idle-label', btn.textContent);
    btn.disabled = !!on;
    btn.style.opacity = on ? '.65' : '';
    btn.textContent = on ? (label || 'Sending…') : btn.getAttribute('data-idle-label');
  }

  function succeed(form) {
    var thanks = document.getElementById('thanks');
    if (thanks) {
      thanks.classList.remove('hide');
      form.classList.add('hide');
      form.reset();
      lock(form, false);
      if (thanks.scrollIntoView) thanks.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    form.reset();
    lock(form, false);
    say(form, 'Thanks — your inquiry is in. We usually reply within the hour.', 'ok');
  }

  /* The safety net: never leave a lead with nothing. */
  function fallback(form, pairs) {
    lock(form, false);
    var body = txt(pairs);
    var href = 'mailto:' + MAILTO_TO +
      '?subject=' + encodeURIComponent(FALLBACK_SUBJECT) +
      '&body=' + encodeURIComponent(body);

    var el = statusEl(form);
    el.textContent = '';
    el.style.color = '#F5E3BE';
    el.style.textAlign = 'left';

    var head = document.createElement('span');
    head.innerHTML = 'Our form service is briefly unavailable, so we&rsquo;ve turned this into an email for you. ' +
      '<strong>Your details are below</strong> &mdash; send them to us, or text <a href="' + FALLBACK_SMS + '" style="color:#F5E3BE">' + PHONE_DISPLAY + '</a>.';
    el.appendChild(head);

    var box = document.createElement('textarea');
    box.value = body;
    box.readOnly = true;
    box.rows = 7;
    box.style.cssText = 'width:100%;margin-top:10px;padding:10px;border-radius:8px;border:1px solid rgba(255,255,255,.25);background:rgba(0,0,0,.25);color:#fff;font:12.5px/1.5 ui-monospace,Menlo,monospace;';
    el.appendChild(box);

    var row = document.createElement('div');
    row.style.cssText = 'margin-top:10px;display:flex;gap:10px;flex-wrap:wrap;';

    var send = document.createElement('a');
    send.href = href;
    send.textContent = '✉️ Open email with these details';
    send.style.cssText = 'display:inline-block;padding:11px 18px;border-radius:999px;background:#C69341;color:#1E1A16;font-weight:600;text-decoration:none;';
    row.appendChild(send);

    var copy = document.createElement('button');
    copy.type = 'button';
    copy.textContent = '📋 Copy details';
    copy.style.cssText = 'padding:11px 18px;border-radius:999px;background:transparent;border:1px solid rgba(255,255,255,.35);color:#fff;font:inherit;cursor:pointer;';
    copy.addEventListener('click', function () {
      box.select();
      var done = false;
      try { done = document.execCommand('copy'); } catch (e) {}
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(body).then(function () { copy.textContent = '✅ Copied'; },
          function () { copy.textContent = done ? '✅ Copied' : 'Select + copy above'; });
      } else {
        copy.textContent = done ? '✅ Copied' : 'Select + copy above';
      }
    });
    row.appendChild(copy);
    el.appendChild(row);

    try { window.location.href = href; } catch (e) {}
  }

  function send(form, pairs) {
    var payload = toObject(pairs);
    payload._subject = (form.querySelector('input[name="_subject"]') || {}).value || FALLBACK_SUBJECT;
    payload._template = 'table';
    payload._captcha = 'false';

    var ctrl = null, timer = null;
    var opts = {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    };
    if (window.AbortController) {
      ctrl = new AbortController();
      opts.signal = ctrl.signal;
      timer = setTimeout(function () { try { ctrl.abort(); } catch (e) {} }, TIMEOUT_MS);
    }

    return fetch(ENDPOINT, opts).then(function (res) {
      if (timer) clearTimeout(timer);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json().catch(function () { return {}; });
    }).then(function (json) {
      if (json && json.success === 'false') throw new Error('endpoint rejected');
      return true;
    });
  }

  function wire(form) {
    if (form.getAttribute('data-inq-wired')) return;
    form.setAttribute('data-inq-wired', '1');
    form.addEventListener('submit', function (ev) {
      ev.preventDefault();

      var honey = form.querySelector('input[name="_honey"]');
      if (honey && honey.value) { succeed(form); return; }        // bot: look successful, send nothing

      if (form.checkValidity && !form.checkValidity()) {
        if (form.reportValidity) form.reportValidity();
        return;
      }

      var pairs = collect(form);
      if (!pairs.length) { say(form, 'Please fill in the form first.', 'err'); return; }

      lock(form, true);
      say(form, '');

      send(form, pairs).then(function () {
        succeed(form);
      }).catch(function () {
        fallback(form, pairs);
      });
    });
  }

  function boot() {
    var forms = document.querySelectorAll('form.inq');
    for (var i = 0; i < forms.length; i++) wire(forms[i]);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
