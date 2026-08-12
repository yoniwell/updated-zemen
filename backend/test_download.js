const { ContentService } = require('./src/modules/content/services/content.service');
const { ContentRepository } = require('./src/modules/content/repositories/content.repository');

const repo = new ContentRepository();
const service = new ContentService(repo);

async function main() {
  try {
    const res = await service.createItem('download-files', {
      categoryId: 'test-cat',
      name: 'Test File',
      size: '1 MB',
      type: 'PDF',
      link: '#',
      sortOrder: 0,
      published: true
    }, 'dummy-admin-id');
    console.log('Success:', res);
  } catch (e) {
    console.error('Error:', e);
  }
}
main();
