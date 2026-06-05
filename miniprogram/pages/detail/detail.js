const { getListing, deleteListing, toggleFavorite, isFavorite } = require('../../utils/listingService');

Page({
  data: {
    id: '',
    listing: null,
    favorite: false
  },

  onLoad(options) {
    this.setData({ id: options.id || '' });
  },

  onShow() {
    this.loadListing();
  },

  async loadListing() {
    if (!this.data.id) return;
    wx.showLoading({ title: '加载中' });
    try {
      const listing = await getListing(this.data.id);
      this.setData({
        listing,
        favorite: isFavorite(this.data.id)
      });
    } catch (error) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  editCurrent() {
    wx.navigateTo({ url: `/pages/form/form?id=${this.data.id}` });
  },

  deleteCurrent() {
    wx.showModal({
      title: '删除房源？',
      content: '删除后将不再显示这套房源。',
      confirmColor: '#d35c35',
      success: async result => {
        if (!result.confirm) return;
        wx.showLoading({ title: '删除中' });
        try {
          await deleteListing(this.data.id);
          wx.hideLoading();
          wx.navigateBack();
        } catch (error) {
          wx.hideLoading();
          wx.showToast({ title: '删除失败', icon: 'none' });
        }
      }
    });
  },

  toggleFavorite() {
    const nextIds = toggleFavorite(this.data.id);
    const nextFavorite = nextIds.includes(this.data.id);
    this.setData({ favorite: nextFavorite });
    wx.showToast({
      title: nextFavorite ? '已加入喜欢' : '已取消喜欢',
      icon: 'none'
    });
  }
});
