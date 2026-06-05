const cloud = require('wx-server-sdk');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();
const collection = db.collection('houseListings');

exports.main = async (event) => {
  const { action, id, data, status } = event;

  if (action === 'list') {
    const query = status && status !== '全部' ? collection.where({ status }) : collection;
    return query.orderBy('updatedAt', 'desc').get();
  }

  if (action === 'get') {
    return collection.doc(id).get();
  }

  if (action === 'delete') {
    return collection.doc(id).remove();
  }

  if (action === 'update') {
    return collection.doc(id).update({ data });
  }

  if (action === 'create') {
    return collection.add({ data });
  }

  return { error: 'Unknown action' };
};
