'use strict';
const { esc, md, dateRu } = require('./util');
const { layout, links, tel } = require('./layout');
const { principles, facts } = require('./seed-data');

const slugHref = (ctx, slug) => `${ctx.base}/${slug}/`;

// ---------- общие блоки ----------
function leadForm(ctx, { id = 'lead', practices, preset = '' }) {
  const u = (p) => ctx.base + p;
  const action = ctx.staticMode ? (ctx.apiUrl || '') : u('/api/lead');
  const opts = practices.map((p) => `<option value="${esc(p.title)}" data-slug="${esc(p.slug)}"${preset === p.slug ? ' selected' : ''}>${esc(p.title)}</option>`).join('');
  return `<form class="form" id="${id}" method="post" action="${esc(action || '#')}" data-lead-form>
  <div class="field"><label for="${id}-name">Имя</label><input id="${id}-name" name="name" required maxlength="120" autocomplete="name"></div>
  <div class="field"><label for="${id}-phone">Телефон или мессенджер</label><input id="${id}-phone" name="phone" maxlength="60" autocomplete="tel"></div>
  <div class="field"><label for="${id}-email">Электронная почта</label><input id="${id}-email" name="email" type="email" maxlength="160" autocomplete="email"></div>
  <div class="field"><label for="${id}-topic">Направление</label><select id="${id}-topic" name="topic"><option value="">Пока не знаю</option>${opts}<option value="Другое">Другое</option></select></div>
  <div class="field wide"><label for="${id}-msg">Кратко о ситуации</label><textarea id="${id}-msg" name="message" rows="5" required minlength="10" maxlength="4000"></textarea></div>
  <div class="field wide check"><label><input type="checkbox" name="urgent" value="1"> Срочное дело: нужен ответ в течение двух часов</label></div>
  <div class="field wide check"><label><input type="checkbox" name="consent" value="1" required> Согласен на обработку данных по <a href="${u('/privacy/')}">политике конфиденциальности</a></label></div>
  <div class="hp" aria-hidden="true"><label>Не заполняйте <input name="website" tabindex="-1" autocomplete="off"></label></div>
  <div class="actions wide"><button class="btn" type="submit">Отправить запрос</button><p class="form-note" role="status" aria-live="polite" data-form-status>Укажите телефон или почту. Обращение конфиденциально.</p></div>
</form>`;
}

function messengerButtons(ctx, cls = '') {
  const L = links(ctx.settings);
  return [
    L.tg ? `<a class="btn ${cls}" href="${L.tg}" rel="noopener">Написать в Telegram</a>` : '',
    L.wa ? `<a class="btn ${cls} alt" href="${L.wa}" rel="noopener">WhatsApp</a>` : '',
  ].join('');
}

function ctaBand(ctx, { title = 'Расскажите о ситуации, и мы подскажем, как действовать', text = 'Первичная консультация конфиденциальна. По срочным делам отвечаем круглосуточно.', topic = '' } = {}) {
  const u = (p) => ctx.base + p;
  const s = ctx.settings;
  return `<section class="cta-band"><div class="wrap cta-in">
  <div><h2>${esc(title)}</h2><p>${esc(text)}</p></div>
  <div class="cta-actions">
    ${messengerButtons(ctx, 'gold')}
    <a class="btn outline-light" href="${u('/contacts/' + (topic ? '?topic=' + topic : ''))}">Форма обратной связи</a>
    ${s.phone ? `<a class="cta-phone" href="tel:${esc(tel(s.phone))}">${esc(s.phone)}</a>` : ''}
  </div>
</div></section>`;
}

function dirCard(ctx, p, cls = '') {
  const badge = p.slug === 'crm' ? '<span class="badge">ИИ без интернета</span>' : p.slug === 'arbitrazh' ? '<span class="badge">Основная практика</span>' : '';
  const list = cls.includes('dir-main') ? `<ul class="dir-list">${p.services.slice(0, 6).map((x) => `<li>${esc(x.title)}</li>`).join('')}</ul>` : '';
  return `<a class="dir ${cls}" href="${slugHref(ctx, p.slug)}">${badge}<h3>${esc(p.title)}</h3><p>${esc(p.summary)}</p>${list}<span class="more">Подробнее</span></a>`;
}

const newsCard = (ctx, a) => `<li><a href="${ctx.base}/news/${a.slug}/"><p class="n-meta"><time datetime="${a.published_at}">${dateRu(a.published_at)}</time>${a.category ? `<span>${esc(a.category)}</span>` : ''}</p><h3>${esc(a.title)}</h3><p>${esc(a.summary)}</p></a></li>`;

// ---------- главная ----------
function home(ctx, { practices, news }) {
  const u = (p) => ctx.base + p;
  const L = links(ctx.settings);
  const [main, ...rest] = practices;
  const body = `
<section class="hero">
  <div class="wrap hero-grid">
    <div class="hero-text">
      <h1>Защита интересов в судах России и за рубежом</h1>
      <p class="lead">Арбитражные споры РФ — наша основная практика. Гражданское право, международная защита и собственная CRM для юристов в одной фирме.</p>
      <div class="actions"><a class="btn" href="${u('/contacts/')}">Получить консультацию</a><a class="btn ghost" href="#directions">Направления</a></div>
      <p class="hero-links">${L.tg ? `<a href="${L.tg}" rel="noopener">Telegram</a>` : ''}${L.wa ? `<a href="${L.wa}" rel="noopener">WhatsApp</a>` : ''}${ctx.settings.phone ? `<a href="tel:${esc(tel(ctx.settings.phone))}">${esc(ctx.settings.phone)}</a>` : ''}</p>
    </div>
    <div class="hero-art"><img src="${u('/img/logo-symbol.webp')}" width="640" height="559" alt="Эмблема DataLaw International" fetchpriority="high"></div>
  </div>
</section>

<section class="facts-band"><div class="wrap"><dl class="facts">${facts.map(([n, l]) => `<div><dt>${esc(n)}</dt><dd>${esc(l)}</dd></div>`).join('')}</dl></div></section>

<section class="section" id="about">
  <div class="wrap split">
    <div>
      <h2>О фирме</h2>
      <div class="prose-sans">
        <p>DataLaw International — юридическая фирма, которая ведёт арбитражные споры в России, гражданские дела частных лиц и международные дела. Основатель фирмы работает в праве с 1997 года.</p>
        <p>Мы консультируем на русском, английском, немецком и французском языках и сопровождаем клиентов на всех стадиях: от оценки перспектив до исполнения решения.</p>
        <p>Для юристов мы разработали собственную CRM-систему «Лайла» с ИИ-ассистентом, который работает без интернета.</p>
      </div>
      <a class="link" href="${u('/contacts/')}">Связаться с нами</a>
    </div>
    <ul class="principles">${principles.map(([t, d]) => `<li><h3>${esc(t)}</h3><p>${esc(d)}</p></li>`).join('')}</ul>
  </div>
</section>

<section class="section tone" id="directions">
  <div class="wrap">
    <div class="sec-head"><h2>Направления</h2><p>Четыре направления, которые закрывают весь путь: от спора в российском суде до дела с международным элементом.</p></div>
    <div class="dir-grid">
      ${dirCard(ctx, main, 'dir-main')}
      <div class="dir-side">${rest.map((p) => dirCard(ctx, p)).join('')}</div>
    </div>
  </div>
</section>

${news.length ? `<section class="section">
  <div class="wrap">
    <div class="sec-head"><h2>Новости</h2><p><a class="link" href="${u('/news/')}">Все новости</a></p></div>
    <ul class="nlist">${news.slice(0, 3).map((a) => newsCard(ctx, a)).join('')}</ul>
  </div>
</section>` : ''}

${ctaBand(ctx)}`;
  return layout(ctx, { title: '', path: '/', body, bodyClass: 'home' });
}

// ---------- направления ----------
function groupServices(list) {
  const tags = [...new Set(list.map((s) => s.tag))];
  if (list.length && list.every((s) => s.tag) && tags.length > 1 && tags.length <= 5) return tags.map((t) => ({ title: t, items: list.filter((s) => s.tag === t) }));
  return [{ title: '', items: list }];
}

const STAGES = [
  ['Первая инстанция', 'Арбитражный суд субъекта РФ: иск, доказательства, правовая позиция.'],
  ['Апелляция', 'Арбитражный апелляционный суд: повторное рассмотрение дела по существу.'],
  ['Кассация', 'Арбитражный суд округа: проверка применения норм права.'],
  ['Верховный суд РФ', 'Судебная коллегия по экономическим спорам: исключительные случаи.'],
  ['Исполнение', 'Взыскание по судебному акту, работа с приставами, обеспечительные меры.'],
];

function direction(ctx, { p, practices }) {
  if (p.slug === 'crm') return crm(ctx, { p, practices });
  const u = (x) => ctx.base + x;
  const groups = groupServices(p.services);
  const svc = (items) => `<ul class="svc">${items.map((s) => `<li><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`).join('')}</ul>`;
  const others = practices.filter((x) => x.slug !== p.slug && x.slug !== 'crm').slice(0, 3);
  const body = `
<section class="page-hero">
  <div class="wrap">
    <p class="crumb"><a href="${u('/')}">Главная</a><span>Направления</span></p>
    <h1>${esc(p.title)}</h1>
    <p class="lead">${esc(p.intro)}</p>
    <div class="actions"><a class="btn gold" href="${u('/contacts/?topic=' + p.slug)}">Обсудить дело</a></div>
  </div>
</section>
<section class="section">
  <div class="wrap">
    ${groups.map((g, i) => `<div class="svc-group">${g.title ? `<h2>${esc(g.title)}</h2>` : (i === 0 ? '<h2>Чем мы занимаемся</h2>' : '')}${svc(g.items)}</div>`).join('')}
  </div>
</section>
${p.slug === 'arbitrazh' ? `<section class="section tone"><div class="wrap">
  <div class="sec-head"><h2>Все инстанции</h2><p>Сопровождаем дело на каждой стадии и заранее выстраиваем позицию так, чтобы она работала в вышестоящих судах.</p></div>
  <ol class="stages">${STAGES.map(([t, d]) => `<li><h3>${esc(t)}</h3><p>${esc(d)}</p></li>`).join('')}</ol>
</div></section>` : ''}
<section class="section${p.slug === 'arbitrazh' ? '' : ' tone'}">
  <div class="wrap">
    <div class="sec-head"><h2>Другие направления</h2></div>
    <div class="dir-row">${others.map((x) => dirCard(ctx, x)).join('')}${dirCard(ctx, practices.find((x) => x.slug === 'crm') || others[0])}</div>
  </div>
</section>
${ctaBand(ctx, { topic: p.slug })}`;
  return layout(ctx, { title: p.title, desc: p.summary, path: `/${p.slug}/`, body });
}

// ---------- CRM «Лайла» ----------
function crm(ctx, { p, practices }) {
  const u = (x) => ctx.base + x;
  const body = `
<section class="page-hero crm-hero">
  <div class="wrap crm-grid">
    <div>
      <p class="crumb"><a href="${u('/')}">Главная</a><span>Направления</span></p>
      <h1>CRM для юристов с ИИ, который работает без интернета</h1>
      <p class="lead">${esc(p.intro)}</p>
      <div class="actions"><a class="btn gold" href="${u('/contacts/?topic=crm')}">Запросить демонстрацию</a></div>
    </div>
    <figure class="mock-wrap">
      <div class="mock" aria-hidden="true">
        <div class="mock-bar"><i></i><i></i><i></i><span>DataLaw CRM</span><em>Без интернета</em></div>
        <div class="mock-body">
          <div class="mock-side"><b>Дела</b><span>Клиенты</span><span>Календарь</span><span>Документы</span><span>Лайла</span></div>
          <div class="mock-main">
            <div class="mock-row"><strong>Взыскание задолженности по договору поставки</strong><small>Арбитражный суд, заседание через 6 дней</small><u>Срок: 3 дня</u></div>
            <div class="mock-row"><strong>Раздел наследственного имущества</strong><small>Районный суд, подготовка иска</small><u class="ok">В работе</u></div>
            <div class="mock-row"><strong>Жалоба в вышестоящий суд</strong><small>Черновик подготовлен Лайлой</small><u class="ok">На проверке</u></div>
          </div>
          <div class="mock-laila"><p class="q">Подготовь черновик отзыва на иск по материалам дела</p><p class="a">Черновик готов: структура позиции, ссылки на документы дела и контраргументы. Проверьте и доработайте перед подачей.</p></div>
        </div>
      </div>
      <figcaption>Иллюстрация интерфейса</figcaption>
    </figure>
  </div>
</section>
<section class="section">
  <div class="wrap">
    <div class="sec-head"><h2>Возможности</h2><p>Всё, что юристу нужно для ведения практики, в одном приложении на вашем компьютере.</p></div>
    <ul class="svc svc-3">${p.services.map((s) => `<li><h3>${esc(s.title)}</h3><p>${esc(s.text)}</p></li>`).join('')}</ul>
  </div>
</section>
<section class="section tone laila-block">
  <div class="wrap split">
    <div>
      <h2>Лайла работает там, где лежат ваши документы</h2>
      <p class="lead">Облачные ИИ-сервисы требуют отправлять материалы дела на чужие серверы. Лайла устроена иначе: модель и база работают на вашем устройстве, поэтому данные клиентов никуда не уходят, даже если интернета нет.</p>
    </div>
    <ul class="checks">
      <li>Работа полностью офлайн</li>
      <li>База хранится на устройстве</li>
      <li>Шифрование данных до любой передачи</li>
      <li>Решение всегда за юристом</li>
    </ul>
  </div>
</section>
${ctaBand(ctx, { title: 'Покажем систему на ваших задачах', text: 'Запросите демонстрацию: расскажем о возможностях и условиях подключения.', topic: 'crm' })}`;
  return layout(ctx, { title: p.title, desc: p.summary, path: '/crm/', body, bodyClass: 'crm' });
}

// ---------- новости ----------
function newsIndex(ctx, { news }) {
  const body = `<section class="page-hero compact"><div class="wrap"><h1>Новости</h1><p class="lead">Новости фирмы и короткие практические разборы.</p></div></section>
<section class="section"><div class="wrap">${news.length ? `<ul class="nlist wide">${news.map((a) => newsCard(ctx, a)).join('')}</ul>` : '<p class="empty">Новостей пока нет.</p>'}</div></section>`;
  return layout(ctx, { title: 'Новости', path: '/news/', body });
}

function newsItem(ctx, { a }) {
  const u = (p) => ctx.base + p;
  const body = `<article class="article"><div class="wrap narrow">
  <p class="crumb"><a href="${u('/news/')}">Новости</a></p>
  <h1>${esc(a.title)}</h1>
  <p class="meta"><time datetime="${a.published_at}">${dateRu(a.published_at)}</time>${a.category ? ', ' + esc(a.category) : ''}</p>
  <div class="prose">${md(a.body)}</div>
</div></article>
${ctaBand(ctx)}`;
  return layout(ctx, { title: a.title, desc: a.summary, path: `/news/${a.slug}/`, body });
}

// ---------- контакты ----------
function contacts(ctx, { practices, preset, sent }) {
  const s = ctx.settings, L = links(s);
  const body = `
<section class="page-hero compact"><div class="wrap"><h1>Контакты</h1><p class="lead">Опишите ситуацию, и мы свяжемся с вами. Первичная консультация конфиденциальна. По срочным делам отвечаем круглосуточно.</p></div></section>
<section class="section"><div class="wrap split form-split">
  <div class="contacts">
    ${sent ? '<p class="notice" role="status">Запрос получен. Мы свяжемся с вами в ближайшее время.</p>' : ''}
    <div class="messengers">${messengerButtons(ctx)}</div>
    <dl>
      ${s.phone ? `<dt>Телефон</dt><dd><a href="tel:${esc(tel(s.phone))}">${esc(s.phone)}</a></dd>` : ''}
      ${s.email ? `<dt>Электронная почта</dt><dd><a href="mailto:${esc(s.email)}">${esc(s.email)}</a></dd>` : ''}
      ${s.address ? `<dt>Адрес</dt><dd>${esc(s.address)}</dd>` : ''}
      ${s.hours ? `<dt>Часы приёма</dt><dd>${esc(s.hours)}</dd>` : ''}
      ${s.languages ? `<dt>Языки работы</dt><dd>${esc(s.languages)}</dd>` : ''}
    </dl>
  </div>
  ${leadForm(ctx, { id: 'lead', practices, preset })}
</div></section>`;
  return layout(ctx, { title: 'Контакты', desc: 'Связаться с DataLaw International: форма, Telegram, WhatsApp, телефон.', path: '/contacts/', body });
}

function privacy(ctx) {
  const s = ctx.settings;
  const body = `<section class="page-hero compact"><div class="wrap narrow"><h1>Политика конфиденциальности</h1></div></section>
<section class="section"><div class="wrap narrow prose">
<p>Мы собираем только те данные, которые вы указываете в форме: имя, телефон или почту и описание ситуации. Они нужны, чтобы связаться с вами и оценить, можем ли мы помочь.</p>
<p>Данные хранятся на сервере фирмы и не передаются третьим лицам. Доступ к ним имеют только сотрудники, работающие с обращениями.</p>
<p>Вы можете в любой момент попросить удалить ваше обращение: напишите на <a href="mailto:${esc(s.email)}">${esc(s.email)}</a>.</p>
<p>Сайт не использует рекламные трекеры. Шрифты загружаются с сервиса Google Fonts.</p>
<p><em>Текст является шаблоном. Перед запуском его должен проверить юрист с учётом применимого законодательства о персональных данных.</em></p>
</div></section>`;
  return layout(ctx, { title: 'Конфиденциальность', path: '/privacy/', body });
}

function notFound(ctx) {
  const u = (p) => ctx.base + p;
  const body = `<section class="page-hero compact"><div class="wrap"><h1>Страница не найдена</h1><p class="lead">Возможно, адрес изменился. Начните с <a class="link" href="${u('/')}">главной</a> или перейдите в <a class="link" href="${u('/arbitrazh/')}">раздел «Арбитраж РФ»</a>.</p></div></section>`;
  return layout(ctx, { title: 'Страница не найдена', path: '/404', body, noindex: true });
}

module.exports = { home, direction, newsIndex, newsItem, contacts, privacy, notFound };
