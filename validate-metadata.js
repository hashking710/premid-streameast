const fs = require('fs');
const https = require('https');

const metadata = JSON.parse(fs.readFileSync('streameast-activity/metadata.json', 'utf8'));

https.get('https://schemas.premid.app/metadata/1.16', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const schema = JSON.parse(data);
    const required = schema.required || [];
    const props = Object.keys(schema.properties || {});
    const metaKeys = Object.keys(metadata);

    console.log('=== Schema required fields ===');
    console.log(required.join(', '));
    console.log('\n=== Our metadata fields ===');
    console.log(metaKeys.join(', '));
    console.log('\n=== Missing required fields ===');
    const missing = required.filter(f => !metaKeys.includes(f));
    console.log(missing.length ? missing.join(', ') : 'NONE');
    console.log('\n=== Fields not in schema properties (additionalProperties check) ===');
    const extra = metaKeys.filter(f => !props.includes(f) && f !== '$schema');
    console.log(extra.length ? extra.join(', ') : 'NONE');
    console.log('\n=== Settings item schema allowed fields ===');
    const settingProps = Object.keys(schema.properties.settings?.items?.properties || {});
    console.log(settingProps.join(', '));
    console.log('\n=== Settings additionalProperties ===');
    console.log(schema.properties.settings?.items?.additionalProperties);
    console.log('\n=== Category enum ===');
    console.log(JSON.stringify(schema.properties.category?.enum));
  });
}).on('error', e => console.error('Fetch error:', e.message));
