const fs = require('fs');
const path = require('path');
const properties = require('dot-properties');
const AWS = require('aws-sdk');
const ProgressBar = require('progress');
const readline = require('readline');


function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(res => {
    rl.question(question, (data) => {
      rl.close();
      res(data);
    });
  });

}

function getBlobIdFromPath(file) {
  const tkens = file.split('-');
  return tkens[tkens.length - 1];
}

async function getBlobMetadata(blobPath) {
  const x = await fs.promises.readFile(blobPath + '.properties');
  const props = await properties.parse(x.toString());

  delete props.size;
  if (props['custom.data'] === 'null')
    delete props['custom.data']

  return props;
}

async function getFiles(dir) {
  const dirents = await fs.promises.readdir(dir, { withFileTypes: true });

  const files = await Promise.all(dirents.map((dirent) => {
    const res = path.resolve(dir, dirent.name);
    return dirent.isDirectory() ? getFiles(res) : res;
  }));
  return Array.prototype.concat(...files).filter(f => f.endsWith('.data'));
}

async function uploadToS3(s3, file, bucketName) {
  const blobId = getBlobIdFromPath(file);

  const meta = await getBlobMetadata(file);

  var fileStream = fs.createReadStream(file + '.data');

  const params = {
    Bucket: bucketName,
    Key: blobId,
    Body: fileStream,
    Metadata: meta,
  }

  return await new Promise((resolve, reject) => {
    fileStream.on('error', reject);
    s3.upload(params, function (err, data) {
      if (err)
        reject(err);
      if (data)
        resolve({ id: blobId, url: data });
    });
  })
}

async function main() {
  let awsRegion = 'eu-west-1';
  let bucketName;
  let blobDir;
  // let bucketName = 'test-portofino-s3-noencrypt-bucket';
  // let blobDir = '/Users/mattia/Documents/projects/mdcrm-2/.devenv/blobs';

  console.log("Assicurati di avere le token aws nella tua homedir!");
  await ask('premi invio per continuare');
  console.log('\n');

  awsRegion = await ask(`AWS Region [${awsRegion}]\t: `) || awsRegion;
  while (!bucketName)
    bucketName = await ask(`Bucket name\t\t: `);

  while (!blobDir || !fs.existsSync(blobDir)) {
    blobDir = await ask(`Blob dir\t\t: `);
    if (!fs.existsSync(blobDir))
      console.log(`Il percorso ${blobDir} non esiste`);
  }

  console.log('\n');

  AWS.config.update({ region: awsRegion });
  const s3 = new AWS.S3();

  const x = (await getFiles(blobDir)).map(f => f.slice(0, -5));

  const progressBar = new ProgressBar('Uploading: :blob [:bar] :current/:total eta: :etas', {
    width: 40,
    incomplete: ' ',
    total: x.length
  })

  for (const f of x) {
    try {
      await uploadToS3(s3, f, bucketName);
      progressBar.tick({ blob: getBlobIdFromPath(f) })
    } catch (e) {
      console.error(e);
      return;
    }
  }
}

main();