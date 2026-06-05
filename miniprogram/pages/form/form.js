const {
  STATUS_OPTIONS,
  getListing,
  saveListing,
  uploadMedia,
  splitLines
} = require('../../utils/listingService');

const blankForm = {
  title: '',
  price: '',
  location: '',
  community: '',
  layout: '',
  area: '',
  orientation: '',
  floor: '',
  commute: '',
  sourceUrl: '',
  contact: '',
  status: STATUS_OPTIONS[0],
  pros: [],
  cons: [],
  note: '',
  rating: 0,
  visitDate: '',
  coverUrl: '',
  images: [],
  videos: []
};

Page({
  data: {
    id: '',
    form: { ...blankForm },
    prosText: '',
    consText: '',
    statusOptions: STATUS_OPTIONS,
    statusIndex: 0
  },

  onLoad(options) {
    const id = options.id || '';
    this.setData({ id });
    if (id) {
      wx.setNavigationBarTitle({ title: '编辑房源' });
      this.loadListing(id);
    } else {
      wx.setNavigationBarTitle({ title: '新增房源' });
    }
  },

  async loadListing(id) {
    wx.showLoading({ title: '加载中' });
    try {
      const listing = await getListing(id);
      const form = { ...blankForm, ...listing };
      this.setData({
        form,
        prosText: form.pros.join('\n'),
        consText: form.cons.join('\n'),
        statusIndex: STATUS_OPTIONS.indexOf(form.status)
      });
    } catch (error) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onInput(event) {
    const field = event.currentTarget.dataset.field;
    if (field === 'prosText' || field === 'consText') {
      this.setData({ [field]: event.detail.value });
      return;
    }
    this.setData({ [`form.${field}`]: event.detail.value });
  },

  onStatusChange(event) {
    const index = Number(event.detail.value);
    this.setData({
      statusIndex: index,
      'form.status': STATUS_OPTIONS[index]
    });
  },

  onRatingChange(event) {
    this.setData({ 'form.rating': event.detail.value });
  },

  onVisitDateChange(event) {
    this.setData({ 'form.visitDate': event.detail.value });
  },

  chooseImages() {
    const remain = 12 - this.data.form.images.length;
    if (remain <= 0) {
      wx.showToast({ title: '最多 12 张图片', icon: 'none' });
      return;
    }

    wx.chooseMedia({
      count: remain,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: async result => {
        await this.handleUploads(result.tempFiles.map(file => file.tempFilePath), 'image');
      }
    });
  },

  chooseVideo() {
    const remain = 3 - this.data.form.videos.length;
    if (remain <= 0) {
      wx.showToast({ title: '最多 3 个视频', icon: 'none' });
      return;
    }

    wx.chooseMedia({
      count: remain,
      mediaType: ['video'],
      sourceType: ['album', 'camera'],
      success: async result => {
        await this.handleUploads(result.tempFiles.map(file => file.tempFilePath), 'video');
      }
    });
  },

  async handleUploads(paths, type) {
    wx.showLoading({ title: '上传中' });
    try {
      const urls = [];
      for (const path of paths) {
        urls.push(await uploadMedia(path, type));
      }
      const field = type === 'image' ? 'images' : 'videos';
      const nextMedia = [...this.data.form[field], ...urls];
      const nextCover = this.data.form.coverUrl || (type === 'image' ? nextMedia[0] : '');
      this.setData({
        [`form.${field}`]: nextMedia,
        'form.coverUrl': nextCover
      });
    } catch (error) {
      wx.showToast({ title: '上传失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  removeMedia(event) {
    const { type, index } = event.currentTarget.dataset;
    const field = type === 'image' ? 'images' : 'videos';
    const removeIndex = Number(index);
    const nextMedia = this.data.form[field].filter((_, mediaIndex) => mediaIndex !== removeIndex);
    this.setData({
      [`form.${field}`]: nextMedia,
      'form.coverUrl': field === 'images' ? (nextMedia[0] || '') : this.data.form.coverUrl
    });
  },

  async submit() {
    const form = {
      ...this.data.form,
      _id: this.data.id,
      pros: splitLines(this.data.prosText),
      cons: splitLines(this.data.consText)
    };

    if (!form.title && !form.community) {
      wx.showToast({ title: '请填写标题或小区', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '保存中' });
    try {
      const id = await saveListing(form);
      wx.hideLoading();
      wx.showToast({ title: '已保存' });
      setTimeout(() => {
        if (this.data.id) {
          wx.navigateBack();
        } else {
          wx.redirectTo({ url: `/pages/detail/detail?id=${id}` });
        }
      }, 500);
    } catch (error) {
      wx.hideLoading();
      wx.showToast({ title: '保存失败', icon: 'none' });
    }
  }
});
