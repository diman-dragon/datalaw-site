'use strict';
const { esc, md, dateRu } = require('./util');
const { layout, MARK } = require('./layout');
const { principles, credentials, stats } = require('./seed-data');

const tel = (s) => String(s || '').replace(/[^+\d]/g, '');

function leadForm(ctx, { id = 'lead', practices, preset = '' }) {
  const u = (p) => ctx.base + p;
  const action = ctx.staticMode ? (ctx.apiUrl || '') : u('/api/lead');
  const opts = practices.map((p) => `<option value="${esc(p.title)}" data-slug="${esc(p.slug)}"${preset === p.slug ? ' selected' : ''}>${esc(p.title)}</option>`).join('');
  return `<form class="form" id="${id}" method="post" action="${esc(action || '#')}" data-lead-form>
  <div class="field"><label for="${id}-name">Имя и фамилия</label><input id="${id}-name" name="name" required maxlength="120" autocomplete="name"></div>
  <div class="field"><label for="${id}-email">Электронная почта</label><input id="${id}-email" name="email" type="email" required maxlength="160" autocomplete="email"></div>
  <div class="field"><label for="${id}-org">Организация</label><input id="${id}-org" name="org" maxlength="160" autocomplete="organization"></div>
  <div class="field"><label for="${id}-topic">Направление</label><select id="${id}-topic" name="topic"><option value="">Пока не знаю</option>${opts}<option value="Другое">Другое</option></select></div>
  <div class="field wide"><label for="${id}-msg">Кратко о ситуации</label><textarea id="${id}-msg" name="message" rows="5" required minlength="10" maxlength="4000"></textarea></div>
  <div class="field wide check"><label><input type="checkbox" name="urgent" value="1"> Срочное дело: нужен ответ в течение двух часов</label></div>
  <div class="field wide check"><label><input type="checkbox" name="consent" value="1" required> Согласен на обработку данных по <a href="${u('/privacy/')}">политике конфиденциальности</a></label></div>
  <div class="hp" aria-hidden="true"><label>Не заполняйте <input name="website" tabindex="-1" autocomplete="off"></label></div>
  <div class="actions wide"><button class="btn" type="submit">Отправить запрос</button><p class="form-note" role="status" aria-live="polite" data-form-status>Запрос защищён профессиональной тайной. Данные о клиентах мы не передаём третьим лицам.</p></div>
</form>`;
}

function home(ctx, { practices, insights }) {
  const u = (p) => ctx.base + p;
  const s = ctx.settings;
  const rows = practices.map((p) => `<li><a class="prow" href="${u('/practices/' + p.slug + '/')}"><h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p></a></li>`).join('');
  const ins = insights.slice(0, 3).map((a) => `<li><a href="${u('/insights/' + a.slug + '/')}"><time datetime="${a.published_at}">${dateRu(a.published_at)}</time><h3>${esc(a.title)}</h3><p>${esc(a.summary)}</p></a></li>`).join('');
  const body = `
<section class="hero">
  <div class="wrap hero-grid">
    <div class="hero-text">
      <h1>Сложные споры пересекают границы. Мы находим выход.</h1>
      <p class="lead">Мы консультируем международных клиентов по российскому праву, трансграничным спорам и деликатным переговорам, там, где одинаково важны правовая точность и конфиденциальность.</p>
      <div class="actions"><a class="btn" href="${u('/contact/')}">Записаться на консультацию</a><a class="btn ghost" href="${u('/practices/')}">Практики фирмы</a></div>
    </div>
    <div class="hero-mark" aria-hidden="true">${MARK}</div>
  </div>
</section>

<section class="urgent">
  <div class="wrap urgent-grid">
    <h2>Задержание, Red Notice, срочные обеспечительные меры?</h2>
    <p>Круглосуточный протокол реагирования. Напишите или позвоните, ответим в течение двух часов.</p>
    <div class="actions">${s.phone_1 ? `<a class="btn light" href="tel:${esc(tel(s.phone_1))}">${esc(s.phone_1)}</a>` : ''}<a class="btn outline-light" href="${u('/contact/?urgent=1')}">Написать срочно</a></div>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="sec-head"><h2>Практики</h2><p>Мы работаем на пересечении российского права, международного арбитража и трансграничных переговоров.</p></div>
    <ul class="plist">${rows}</ul>
  </div>
</section>

<section class="section tone">
  <div class="wrap split">
    <div>
      <h2>Глубина в двух правовых системах, а не универсальность</h2>
      <p class="lead">Клиенты, работающие на стыке российского и международного права, заслуживают советника с подлинной экспертизой в обеих системах. Наша команда практиковала в Москве, Лондоне, Франкфурте и Женеве.</p>
      <p><a class="link" href="${u('/about/')}">О фирме</a></p>
    </div>
    <dl class="facts">${stats.map(([n, l]) => `<div><dt>${esc(n)}</dt><dd>${esc(l)}</dd></div>`).join('')}</dl>
  </div>
</section>

<section class="section">
  <div class="wrap">
    <div class="sec-head"><h2>Как мы работаем</h2><p>Пять принципов, которые мы применяем в каждом деле.</p></div>
    <ul class="principles">${principles.map(([t, d]) => `<li><h3>${esc(t)}</h3><p>${esc(d)}</p></li>`).join('')}</ul>
  </div>
</section>

${ins ? `<section class="section tone">
  <div class="wrap">
    <div class="sec-head"><h2>Публикации</h2><p><a class="link" href="${u('/insights/')}">Все публикации</a></p></div>
    <ul class="ilist">${ins}</ul>
  </div>
</section>` : ''}

<section class="section" id="contact">
  <div class="wrap split form-split">
    <div>
      <h2>Первая консультация без обязательств</h2>
      <p class="lead">Конфиденциальный разговор очно, по видеосвязи или по телефону: оценим ситуацию и честно скажем, как выглядит правовой ландшафт.</p>
    </div>
    ${leadForm(ctx, { id: 'lead-home', practices })}
  </div>
</section>`;
  return layout(ctx, { title: '', path: '/', body, bodyClass: 'home' });
}

function practicesIndex(ctx, { practices }) {
  const u = (p) => ctx.base + p;
  const body = `
<section class="page-head"><div class="wrap">
  <h1>Практики</h1>
  <p class="lead">Мы берёмся за дела, где другие предпочитают не браться: на пересечении российского права, международного арбитража и трансграничных переговоров.</p>
</div></section>
<section class="section flush"><div class="wrap"><ul class="plist">${practices.map((p) => `<li><a class="prow" href="${u('/practices/' + p.slug + '/')}"><h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p></a></li>`).join('')}</ul></div></section>`;
  return layout(ctx, { title: 'Практики', desc: 'Интерпол и экстрадиция, международный арбитраж, российское право, EU Bridge, OSINT, переговоры.', path: '/practices/', body });
}

function practice(ctx, { p, practices }) {
  const u = (x) => ctx.base + x;
  const i = practices.findIndex((x) => x.slug === p.slug);
  const next = practices[(i + 1) % practices.length];
  const body = `
<article class="practice">
  <div class="wrap pgrid">
    <aside class="pside">
      <div class="sticky">
        <p class="crumb"><a href="${u('/practices/')}">Практики</a></p>
        <h1>${esc(p.title)}</h1>
        <p class="lead">${esc(p.intro)}</p>
        <div class="actions"><a class="btn" href="${u('/contact/?topic=' + encodeURIComponent(p.slug))}">Обсудить дело</a></div>
      </div>
    </aside>
    <div class="pmain">
      <ul class="services">${p.services.map((s) => `<li><div class="s-head"><h2>${esc(s.title)}</h2>${s.tag ? `<span class="tag">${esc(s.tag)}</span>` : ''}</div><p>${esc(s.text)}</p></li>`).join('')}</ul>
      <a class="nextp" href="${u('/practices/' + next.slug + '/')}"><span>Следующая практика</span><strong>${esc(next.title)}</strong></a>
    </div>
  </div>
</article>`;
  return layout(ctx, { title: p.title, desc: p.summary, path: `/practices/${p.slug}/`, body });
}

function about(ctx, { practices }) {
  const s = ctx.settings;
  const body = `
<section class="page-head"><div class="wrap">
  <h1>Экспертиза там, где важна ясность</h1>
  <p class="lead">DataLaw Solutions основана на простом убеждении: клиентам на стыке российского и международного права нужен советник с настоящей глубиной в обеих системах, а не универсальная фирма, которая пытается охватить всё сразу.</p>
</div></section>
<section class="section flush"><div class="wrap split">
  <div class="prose">
    <p>Мы сопровождаем международные компании, инвесторов и частных лиц в российских судах, международных арбитражных трибуналах и перед регуляторами. Нередко это происходит при острой нехватке времени и высоких ставках.</p>
    <p>Наши юристы практиковали в Москве, Лондоне, Франкфурте и Женеве. Поэтому мы спокойно работаем на стыке культур и правовых систем, где обычно возникают осложнения.</p>
    <p>Мы консультируем и ведём переписку на четырёх языках: ${esc(s.languages)}. Официальные документы выдаём на любом из них.</p>
  </div>
  <dl class="facts">${stats.map(([n, l]) => `<div><dt>${esc(n)}</dt><dd>${esc(l)}</dd></div>`).join('')}</dl>
</div></section>
<section class="section tone"><div class="wrap">
  <div class="sec-head"><h2>Представительство и статусы</h2></div>
  <ul class="creds">${credentials.map(([t, d]) => `<li><h3>${esc(t)}</h3><p>${esc(d)}</p></li>`).join('')}</ul>
</div></section>
<section class="section"><div class="wrap">
  <div class="sec-head"><h2>Наш метод</h2></div>
  <ul class="principles">${principles.map(([t, d]) => `<li><h3>${esc(t)}</h3><p>${esc(d)}</p></li>`).join('')}</ul>
</div></section>`;
  return layout(ctx, { title: 'О фирме', desc: 'Глубокая экспертиза в российском и международном праве. Офисы в Лондоне, Франкфурте и Женеве.', path: '/about/', body });
}

function team(ctx, { team }) {
  const body = `
<section class="page-head"><div class="wrap"><h1>Команда</h1><p class="lead">Юристы с практикой в российских судах, международных арбитражных институтах и европейских фирмах.</p></div></section>
<section class="section flush"><div class="wrap"><ul class="people">${team.map((m) => `<li><h2>${esc(m.name)}</h2><p class="role">${esc(m.role)}</p><p>${esc(m.bio)}</p></li>`).join('')}</ul></div></section>`;
  return layout(ctx, { title: 'Команда', path: '/team/', body });
}

function insightsIndex(ctx, { insights }) {
  const u = (p) => ctx.base + p;
  const list = insights.length
    ? `<ul class="ilist wide">${insights.map((a) => `<li><a href="${u('/insights/' + a.slug + '/')}"><time datetime="${a.published_at}">${dateRu(a.published_at)}${a.category ? ', ' + esc(a.category) : ''}</time><h3>${esc(a.title)}</h3><p>${esc(a.summary)}</p></a></li>`).join('')}</ul>`
    : '<p class="empty">Публикаций пока нет. Первые материалы появятся здесь.</p>';
  const body = `<section class="page-head"><div class="wrap"><h1>Публикации</h1><p class="lead">Заметки о практике: Интерпол, российское право, трансграничные споры.</p></div></section>
<section class="section flush"><div class="wrap">${list}</div></section>`;
  return layout(ctx, { title: 'Публикации', path: '/insights/', body });
}

function insight(ctx, { a }) {
  const u = (p) => ctx.base + p;
  const body = `<article class="article"><div class="wrap narrow">
  <p class="crumb"><a href="${u('/insights/')}">Публикации</a></p>
  <h1>${esc(a.title)}</h1>
  <p class="meta"><time datetime="${a.published_at}">${dateRu(a.published_at)}</time>${a.category ? ', ' + esc(a.category) : ''}</p>
  <div class="prose">${md(a.body)}</div>
  <div class="article-cta"><h2>Нужна консультация по вашему делу?</h2><a class="btn" href="${u('/contact/')}">Записаться</a></div>
</div></article>`;
  return layout(ctx, { title: a.title, desc: a.summary, path: `/insights/${a.slug}/`, body });
}

function contact(ctx, { practices, preset, sent }) {
  const s = ctx.settings;
  const body = `
<section class="page-head"><div class="wrap"><h1>Контакты</h1><p class="lead">Мы отвечаем на каждый запрос. Предварительные консультации конфиденциальны и ни к чему не обязывают. Для срочных дел отметьте это в форме, ответим в течение двух часов.</p></div></section>
<section class="section flush"><div class="wrap split form-split">
  <div class="contacts">
    ${sent ? '<p class="notice" role="status">Запрос получен. Мы свяжемся с вами по указанной почте.</p>' : ''}
    <dl>
      <dt>Общие вопросы</dt><dd><a href="mailto:${esc(s.email)}">${esc(s.email)}</a></dd>
      <dt>Программа EU Bridge</dt><dd><a href="mailto:${esc(s.email_eubridge)}">${esc(s.email_eubridge)}</a></dd>
      <dt>Срочные дела, круглосуточно</dt><dd>${[s.phone_1, s.phone_2].filter(Boolean).map((t) => `<a href="tel:${esc(tel(t))}">${esc(t)}</a>`).join('<br>')}</dd>
      <dt>Офисы</dt><dd>${esc(s.offices)}</dd>
      <dt>Языки работы</dt><dd>${esc(s.languages)}</dd>
    </dl>
  </div>
  ${leadForm(ctx, { id: 'lead', practices, preset })}
</div></section>`;
  return layout(ctx, { title: 'Контакты', desc: 'Записаться на конфиденциальную консультацию.', path: '/contact/', body });
}

function privacy(ctx) {
  const s = ctx.settings;
  const body = `<section class="page-head"><div class="wrap narrow"><h1>Политика конфиденциальности</h1></div></section>
<section class="section flush"><div class="wrap narrow prose">
<p>Мы собираем только те данные, которые вы указываете в форме запроса: имя, электронную почту, организацию и описание ситуации. Они нужны, чтобы ответить вам и оценить, можем ли мы помочь.</p>
<p>Данные хранятся на сервере фирмы и не передаются третьим лицам. Доступ к ним имеют только сотрудники, работающие с запросами.</p>
<p>Вы можете в любой момент попросить удалить ваш запрос: напишите на <a href="mailto:${esc(s.email)}">${esc(s.email)}</a>.</p>
<p>Сайт не использует рекламные трекеры. Шрифты загружаются с сервиса Google Fonts.</p>
<p><em>Текст — шаблон. Перед запуском его должен проверить юрист с учётом применимого законодательства о персональных данных.</em></p>
</div></section>`;
  return layout(ctx, { title: 'Конфиденциальность', path: '/privacy/', body });
}

function notFound(ctx) {
  const u = (p) => ctx.base + p;
  const body = `<section class="page-head"><div class="wrap"><h1>Страница не найдена</h1><p class="lead">Возможно, адрес изменился. Начните с <a class="link" href="${u('/')}">главной</a> или посмотрите <a class="link" href="${u('/practices/')}">практики</a>.</p></div></section>`;
  return layout(ctx, { title: 'Страница не найдена', path: '/404', body, noindex: true });
}

module.exports = { home, practicesIndex, practice, about, team, insightsIndex, insight, contact, privacy, notFound };
