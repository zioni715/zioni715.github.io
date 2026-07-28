const feedContainer = document.getElementById('blog-feed');
const statusElement = document.getElementById('blog-status');

const feeds = [
  {
    name: 'Velog',
    homeUrl: 'https://velog.io/@hamzzi_lover',
  },
  {
    name: 'Naver Blog',
    homeUrl: 'https://blog.naver.com/wowgiroong_715',
  },
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

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
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
  if (!feedContainer || !statusElement) return;

  statusElement.textContent = 'Loading posts...';

  try {
    const response = await fetch('/data/blog-posts.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const data = await response.json();
    allPosts = [...(data.velog ?? []), ...(data.naver ?? [])]
      .sort((a, b) => (b.timestamp ?? 0) - (a.timestamp ?? 0));
  } catch (error) {
    console.warn('Unable to load blog posts', error);
    allPosts = [];
  }

  renderPosts();
}

loadFeeds();
