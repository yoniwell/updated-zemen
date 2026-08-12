const { ContentRepository } = require('./src/modules/content/repositories/content.repository');
const { ContentService } = require('./src/modules/content/services/content.service');
const { ContentController } = require('./src/modules/content/controllers/content.controller');

const repo = new ContentRepository();
const service = new ContentService(repo);
const controller = new ContentController(service);

async function test(modelName) {
  const req = { params: { modelName }, query: {} };
  const res = {
    status: (code) => { console.log('Status:', code); return res; },
    json: (data) => console.log(`Data for ${modelName}:`, JSON.stringify(data, null, 2))
  };
  await controller.getItems(req, res, console.error);
}

test('faqs')
  .then(() => test('news'))
  .then(() => test('download-categories'))
  .catch(console.error);
