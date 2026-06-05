const { STATUS_OPTIONS, listListings } = require('../../utils/listingService');

Page({
  data: {
    statusTabs: ['全部', ...STATUS_OPTIONS],
    activeStatus: '全部',
    listings: [],
    currentIndex: 0
  },

  onShow() {
    this.loadListings();
  },

  async loadListings() {
    wx.showLoading({ title: '加载中' });
    try {
      const listings = await listListings(this.data.activeStatus);
      this.setData({
        listings,
        currentIndex: Math.min(this.data.currentIndex, Math.max(listings.length - 1, 0))
      });
    } catch (error) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  switchStatus(event) {
    this.setData({
      activeStatus: event.currentTarget.dataset.status,
      currentIndex: 0
    });
    this.loadListings();
  },

  onSwiperChange(event) {
    this.setData({ currentIndex: event.detail.current });
  },

  goCreate() {
    wx.navigateTo({ url: '/pages/form/form' });
  },

  goDetail(event) {
    const id = event.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/detail/detail?id=${id}` });
  }
});
