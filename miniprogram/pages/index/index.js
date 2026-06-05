const {
  STATUS_OPTIONS,
  SORT_OPTIONS,
  listListings,
  searchListings,
  toggleFavorite,
  isFavorite,
  getListingStats
} = require('../../utils/listingService');

Page({
  data: {
    statusTabs: ['全部', ...STATUS_OPTIONS],
    sortOptions: SORT_OPTIONS,
    activeStatus: '全部',
    activeSort: '最新入库',
    listings: [],
    currentIndex: 0,
    keyword: '',
    stats: { total: 0, liked: 0, visited: 0, eliminated: 0 }
  },

  onShow() {
    this.loadListings();
  },

  async loadListings() {
    wx.showLoading({ title: '加载中' });
    try {
      const listings = await this.getVisibleListings();
      this.setData({
        listings,
        currentIndex: Math.min(this.data.currentIndex, Math.max(listings.length - 1, 0)),
        stats: getListingStats(listings)
      });
    } catch (error) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  async getVisibleListings() {
    const listings = await searchListings(this.data.keyword, this.data.activeStatus);
    return this.applySort(listings).map(item => ({
      ...item,
      favorite: isFavorite(item._id)
    }));
  },

  applySort(listings) {
    const next = [...listings];
    if (this.data.activeSort === '价格优先') {
      return next.sort((a, b) => this.readPrice(a.price) - this.readPrice(b.price));
    }
    if (this.data.activeSort === '评分优先') {
      return next.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0));
    }
    return next.sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
  },

  readPrice(value) {
    const digits = String(value || '').replace(/[^\d]/g, '');
    return digits ? Number(digits) : Number.MAX_SAFE_INTEGER;
  },

  switchStatus(event) {
    this.setData({
      activeStatus: event.currentTarget.dataset.status,
      currentIndex: 0
    });
    this.loadListings();
  },

  switchSort(event) {
    this.setData({
      activeSort: event.currentTarget.dataset.sort,
      currentIndex: 0
    });
    this.loadListings();
  },

  onSwiperChange(event) {
    this.setData({ currentIndex: event.detail.current });
  },

  onKeywordInput(event) {
    this.setData({ keyword: event.detail.value });
  },

  clearKeyword() {
    this.setData({ keyword: '' });
    this.loadListings();
  },

  searchListings() {
    this.loadListings();
  },

  goCreate() {
    wx.navigateTo({ url: '/pages/form/form' });
  },

  goDetail(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
  },

  toggleFavorite(event) {
    event.stopPropagation();
    toggleFavorite(event.currentTarget.dataset.id);
    this.loadListings();
  }
});
