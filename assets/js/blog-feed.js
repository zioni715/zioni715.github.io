const feedContainer = document.getElementById('blog-feed');
const feeds = [
  {
    name: 'Velog',
    url: 'https://proxy.zioni715.github.io/velog-rss',
  },
  {
    name: 'Naver Blog',
    url: 'https://proxy.zioni715.github.io/naver-rss',
  },
];

async function fetchFeed(feed) {
  try {
    const response = await fetch(feed.url);
    if (!response.ok) throw new Error('Feed fetch failed');
    const xmlText = await response.text();
    const parser = new DOMParser();
    const xml = parser.parseFromString(xmlText, 'application/xml');
    const items = Array.from(xml.querySelectorAll('item')).slice(0, 3);
    return items.map(item => ({
      title: item.querySelector('title')?.textContent || 'Untitled',
      link: item.querySelector('link')?.textContent || '#',
      date: item.querySelector('pubDate')?.textContent || '',
      description: item.querySelector('description')?.textContent || '',
      source: feed.name,
    }));
  } catch (error) {
    return [{ title: `Unable to load ${feed.name}`, link: '#', date: '', description: '' }];
  }
}

async function loadFeeds() {
  const results = await Promise.all(feeds.map(fetchFeed));
  const cards = results.flat().slice(0, 6);
  feedContainer.innerHTML = cards.map(card => `
    <a class="blog-card" href="${card.link}" target="_blank" rel="noopener noreferrer">
      <div class="blog-card__source">${card.source}</div>
      <h3 class="blog-card__title">${card.title}</h3>
      <p class="blog-card__date">${card.date}</p>
      <p class="blog-card__description">${card.description}</p>
    </a>
  `).join('');
}

loadFeeds();
