(function () {
  'use strict';
  // мобильное меню
  var burger = document.querySelector('.burger'), nav = document.getElementById('nav');
  if (burger && nav) {
    burger.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      document.body.style.overflow = open ? 'hidden' : '';
    });
  }

  var isStatic = document.body.dataset.static === '1';
  var apiUrl = document.body.dataset.api || '';
  var params = new URLSearchParams(location.search);

  document.querySelectorAll('[data-lead-form]').forEach(function (form) {
    var status = form.querySelector('[data-form-status]');
    var topic = form.querySelector('[name=topic]');
    if (params.get('urgent') === '1') { var u = form.querySelector('[name=urgent]'); if (u) u.checked = true; }
    if (params.get('topic') && topic) {
      var opt = topic.querySelector('option[data-slug="' + params.get('topic').replace(/[^a-z0-9-]/gi, '') + '"]');
      if (opt) topic.value = opt.value;
    }
    function say(text, cls) { status.textContent = text; status.className = 'form-note ' + (cls || ''); }

    form.addEventListener('submit', function (e) {
      var data = Object.fromEntries(new FormData(form).entries());
      data.urgent = form.querySelector('[name=urgent]').checked ? 1 : 0;
      if (data.website) { e.preventDefault(); return; }

      // Статическая версия без бэкенда: открываем почтовый клиент
      if (isStatic && !apiUrl) {
        e.preventDefault();
        var to = document.querySelector('a[href^="mailto:"]');
        var email = to ? to.getAttribute('href').replace('mailto:', '') : '';
        var body = 'Имя: ' + data.name + '\nПочта: ' + data.email + '\nОрганизация: ' + (data.org || '') + '\nНаправление: ' + (data.topic || '') + (data.urgent ? '\nСрочно: да' : '') + '\n\n' + data.message;
        location.href = 'mailto:' + email + '?subject=' + encodeURIComponent('Запрос с сайта') + '&body=' + encodeURIComponent(body);
        say('Открыли письмо в вашей почтовой программе. Отправьте его, и мы ответим.', 'ok');
        return;
      }
      if (!window.fetch) return; // обычная отправка формы
      e.preventDefault();
      form.setAttribute('aria-busy', 'true');
      say('Отправляем…');
      fetch(form.action, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: JSON.stringify(data) })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
        .then(function (res) {
          if (res.ok) { form.reset(); say('Запрос получен. Мы ответим на указанную почту.', 'ok'); }
          else say(res.j && res.j.error ? res.j.error : 'Не удалось отправить. Напишите нам на почту.', 'err');
        })
        .catch(function () { say('Нет связи с сервером. Напишите нам на почту.', 'err'); })
        .then(function () { form.removeAttribute('aria-busy'); });
    });
  });
})();
