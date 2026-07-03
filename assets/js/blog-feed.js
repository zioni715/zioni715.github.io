const feedContainer = document.getElementById('blog-feed');
const statusElement = document.getElementById('blog-status');

const feeds = [
  {
    name: 'Velog',
    url: 'https://v2.velog.io/rss/@hamzzi_lover',
    homeUrl: 'https://velog.io/@hamzzi_lover',
  },
  {
    name: 'Naver Blog',
    url: 'https://rss.blog.naver.com/wowgiroong_715.xml',
    homeUrl: 'https://blog.naver.com/wowgiroong_715',
  },
];

const proxyStrategies = [
  (url) => url,
  (url) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
  (url) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
];

let allPosts = [];

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function stripHtml(value) {
  const template = document.createElement('template');
  template.innerHTML = value ?? '';
  return (template.content.textContent || '').replace(/\s+/g, ' ').trim();
}

function truncate(value, maxLength = 132) {
  if (!value || value.length <= maxLength) return value;
  return `${value.slice(0, maxLength).trim()}...`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getText(parent, selector) {
  return parent.querySelector(selector)?.textContent?.trim() || '';
}

function parseFeed(xmlText, feed) {
  const parser = new DOMParser();
  const xml = parser.parseFromString(xmlText, 'application/xml');

  if (xml.querySelector('parsererror')) {
    throw new Error(`Unable to parse ${feed.name} RSS`);
  }

  const items = Array.from(xml.querySelectorAll('item, entry'));

  return items.map((item) => {
    const rawTitle = getText(item, 'title') || 'Untitled';
    const rawLink =
      getText(item, 'link') ||
      item.querySelector('link[href]')?.getAttribute('href') ||
      feed.homeUrl;
    const rawDate =
      getText(item, 'pubDate') ||
      getText(item, 'published') ||
      getText(item, 'updated') ||
      '';
    const rawDescription =
      getText(item, 'description') ||
      getText(item, 'summary') ||
      getText(item, 'content') ||
      '';

    return {
      title: rawTitle,
      link: rawLink,
      date: rawDate,
      timestamp: new Date(rawDate).getTime() || 0,
      description: truncate(stripHtml(rawDescription)),
      source: feed.name,
    };
  });
}

async function fetchWithTimeout(url, timeoutMs = 9000) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.text();
  } finally {
    window.clearTimeout(timeout);
  }
}

async function fetchFeed(feed) {
  let lastError;

  for (const buildUrl of proxyStrategies) {
    try {
      const xmlText = await fetchWithTimeout(buildUrl(feed.url));
      const posts = parseFeed(xmlText, feed);
      if (posts.length > 0) return posts;
    } catch (error) {
      lastError = error;
    }
  }

  console.warn(`Unable to load ${feed.name}`, lastError);
  return [];
}

function renderPosts() {
  if (allPosts.length === 0) {
    feedContainer.innerHTML = feeds.map((feed) => `
      <a class="blog-card" href="${escapeHtml(feed.homeUrl)}" target="_blank" rel="noopener noreferrer" data-source="${escapeHtml(feed.name)}">
        <div class="blog-card__meta">
          <span class="blog-card__source">${escapeHtml(feed.name)}</span>
        </div>
        <h3 class="blog-card__title">Open ${escapeHtml(feed.name)}</h3>
        <p class="blog-card__description">Posts could not be loaded right now.</p>
      </a>
    `).join('');
    statusElement.textContent = 'Open the source links if posts do not appear.';
    return;
  }

  feedContainer.innerHTML = allPosts.map((post) => `
    <a class="blog-card" href="${escapeHtml(post.link)}" target="_blank" rel="noopener noreferrer" data-source="${escapeHtml(post.source)}">
      <div class="blog-card__meta">
        <span class="blog-card__source">${escapeHtml(post.source)}</span>
        <time datetime="${escapeHtml(post.date)}">${escapeHtml(formatDate(post.date))}</time>
      </div>
      <h3 class="blog-card__title">${escapeHtml(post.title)}</h3>
      <p class="blog-card__description">${escapeHtml(post.description)}</p>
    </a>
  `).join('');

  statusElement.textContent = `${allPosts.length} posts loaded`;
}

async function loadFeeds() {
  if (!feedContainer) return;

  statusElement.textContent = 'Loading posts...';
  const feedResults = await Promise.all(feeds.map(fetchFeed));

  allPosts = feedResults
    .flat()
    .sort((a, b) => b.timestamp - a.timestamp);

  renderPosts();
}

loadFeeds();
