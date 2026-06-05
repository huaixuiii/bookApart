const STORAGE_KEY = 'house_listing_cache';
const COLLECTION = 'houseListings';
const FAVORITE_KEY = 'house_favorite_ids';

const STATUS_OPTIONS = ['待看', '已看', '喜欢', '淘汰'];
const SORT_OPTIONS = ['最新入库', '价格优先', '评分优先'];

const sampleListings = [
  {
    _id: 'sample-1',
    title: '口岸附近通勤友好两居',
    price: '¥5200/月',
    location: '福田口岸',
    community: '口岸生活区',
    layout: '2房1厅',
    area: '68㎡',
    orientation: '南向',
    floor: '中楼层',
    commute: '到口岸步行8分钟',
    sourceUrl: '',
    contact: '中介张姐 138****0000',
    status: '待看',
    pros: ['步行到口岸很近', '客厅采光好', '生活配套完整'],
    cons: ['厨房偏小', '楼龄稍久'],
    note: '适合作为第一优先看房，重点确认噪音和物业。',
    rating: 4,
    visitDate: '',
    coverUrl: '',
    images: [],
    videos: [],
    createdAt: Date.now() - 3600000,
    updatedAt: Date.now() - 3600000
  }
];

function getDatabase() {
  if (!wx.cloud) return null;
  return wx.cloud.database();
}

function splitLines(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value)
    .split(/\n|；|;|,|，/)
    .map(item => item.trim())
    .filter(Boolean);
}

function normalizeListing(listing = {}) {
  const now = Date.now();
  const images = Array.isArray(listing.images) ? listing.images : [];
  const videos = Array.isArray(listing.videos) ? listing.videos : [];
  const coverUrl = listing.coverUrl || images[0] || '';

  return {
    title: listing.title || '',
    price: listing.price || '',
    location: listing.location || '',
    community: listing.community || '',
    layout: listing.layout || '',
    area: listing.area || '',
    orientation: listing.orientation || '',
    floor: listing.floor || '',
    commute: listing.commute || '',
    sourceUrl: listing.sourceUrl || '',
    contact: listing.contact || '',
    status: STATUS_OPTIONS.includes(listing.status) ? listing.status : STATUS_OPTIONS[0],
    pros: Array.isArray(listing.pros) ? listing.pros : splitLines(listing.pros),
    cons: Array.isArray(listing.cons) ? listing.cons : splitLines(listing.cons),
    note: listing.note || '',
    rating: Number(listing.rating || 0),
    visitDate: listing.visitDate || '',
    coverUrl,
    images,
    videos,
    createdAt: listing.createdAt || now,
    updatedAt: now
  };
}

function getCache() {
  return wx.getStorageSync(STORAGE_KEY) || [];
}

function setCache(listings) {
  wx.setStorageSync(STORAGE_KEY, listings);
}

function getFavoriteIds() {
  return wx.getStorageSync(FAVORITE_KEY) || [];
}

function setFavoriteIds(ids) {
  wx.setStorageSync(FAVORITE_KEY, ids);
}

function filterListings(listings, status) {
  if (!status || status === '全部') return listings;
  return listings.filter(item => item.status === status);
}

async function listListings(status) {
  const db = getDatabase();
  if (!db) {
    const cached = getCache();
    return cached.length ? filterListings(cached, status) : filterListings(sampleListings, status);
  }

  try {
    let query = db.collection(COLLECTION);
    if (status && status !== '全部') {
      query = query.where({ status });
    }
    const result = await query.orderBy('updatedAt', 'desc').get();
    setCache(result.data);
    return result.data;
  } catch (error) {
    console.warn('读取云端房源失败，使用本地缓存', error);
    const cached = getCache();
    return cached.length ? filterListings(cached, status) : filterListings(sampleListings, status);
  }
}

async function searchListings(keyword = '', status) {
  const listings = await listListings(status);
  const query = String(keyword || '').trim().toLowerCase();
  if (!query) return listings;

  return listings.filter(item => {
    const haystack = [
      item.title,
      item.location,
      item.community,
      item.layout,
      item.area,
      item.commute,
      item.contact,
      item.note
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });
}

async function getListing(id) {
  const cached = getCache().find(item => item._id === id);
  const db = getDatabase();
  if (!db || id.startsWith('sample-')) return cached || sampleListings.find(item => item._id === id);

  try {
    const result = await db.collection(COLLECTION).doc(id).get();
    return result.data;
  } catch (error) {
    console.warn('读取房源详情失败，使用本地缓存', error);
    return cached;
  }
}

async function saveListing(listing) {
  const db = getDatabase();
  const data = normalizeListing(listing);

  if (!db) {
    const cache = getCache();
    if (listing._id) {
      const nextCache = cache.some(item => item._id === listing._id)
        ? cache.map(item => (item._id === listing._id ? { ...data, _id: listing._id } : item))
        : [{ ...data, _id: listing._id }, ...cache];
      setCache(nextCache);
      return listing._id;
    }
    const id = `local-${Date.now()}`;
    setCache([{ ...data, _id: id }, ...cache]);
    return id;
  }

  if (listing._id && !listing._id.startsWith('sample-') && !listing._id.startsWith('local-')) {
    await db.collection(COLLECTION).doc(listing._id).update({ data });
    return listing._id;
  }

  const result = await db.collection(COLLECTION).add({ data });
  return result._id;
}

async function updateListingStatus(id, status) {
  const db = getDatabase();
  if (!db || id.startsWith('sample-') || id.startsWith('local-')) {
    const cache = getCache();
    const nextCache = cache.map(item => (item._id === id ? { ...item, status, updatedAt: Date.now() } : item));
    setCache(nextCache);
    return;
  }

  await db.collection(COLLECTION).doc(id).update({
    data: {
      status,
      updatedAt: Date.now()
    }
  });
}

async function deleteListing(id) {
  const db = getDatabase();
  if (!db || id.startsWith('sample-') || id.startsWith('local-')) {
    setCache(getCache().filter(item => item._id !== id));
    return;
  }
  await db.collection(COLLECTION).doc(id).remove();
}

async function uploadMedia(filePath, type) {
  if (!wx.cloud) {
    return filePath;
  }

  const ext = filePath.split('.').pop() || (type === 'video' ? 'mp4' : 'jpg');
  const cloudPath = `house-media/${type}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const result = await wx.cloud.uploadFile({ cloudPath, filePath });
  return result.fileID;
}

function toggleFavorite(id) {
  const favorites = new Set(getFavoriteIds());
  if (favorites.has(id)) {
    favorites.delete(id);
  } else {
    favorites.add(id);
  }
  const next = Array.from(favorites);
  setFavoriteIds(next);
  return next;
}

function isFavorite(id) {
  return getFavoriteIds().includes(id);
}

function getListingStats(listings = []) {
  const favorites = new Set(getFavoriteIds());
  return {
    total: listings.length,
    liked: listings.filter(item => favorites.has(item._id)).length,
    visited: listings.filter(item => item.status === '已看').length,
    eliminated: listings.filter(item => item.status === '淘汰').length
  };
}

module.exports = {
  STATUS_OPTIONS,
  SORT_OPTIONS,
  listListings,
  searchListings,
  getListing,
  saveListing,
  updateListingStatus,
  deleteListing,
  uploadMedia,
  splitLines,
  toggleFavorite,
  isFavorite,
  getListingStats
};
