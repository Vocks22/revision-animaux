import fs from 'fs';
import path from 'path';
import https from 'https';

const API_KEY = '55161566-0d7db49331377cd2d9e26bd40';
const IMAGE_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), 'images');

// Mapping: nom fichier -> terme de recherche Pixabay (en anglais pour de meilleurs resultats)
const animals = [
  // Cheval
  { file: 'cheval.jpg', query: 'stallion horse' },
  { file: 'jument.jpg', query: 'mare horse' },
  { file: 'poulain.jpg', query: 'foal horse' },
  // Oie / Jars
  { file: 'jars.jpg', query: 'gander goose male' },
  { file: 'oie.jpg', query: 'goose bird' },
  { file: 'oison.jpg', query: 'gosling baby goose' },
  // Cerf
  { file: 'cerf.jpg', query: 'deer stag antlers' },
  { file: 'biche.jpg', query: 'doe deer female' },
  { file: 'faon.jpg', query: 'fawn baby deer' },
  // Lapin
  { file: 'lapin.jpg', query: 'rabbit' },
  { file: 'lapine.jpg', query: 'rabbit female' },
  { file: 'lapereau.jpg', query: 'baby rabbit bunny' },
  // Mouton / Belier
  { file: 'belier.jpg', query: 'ram sheep horns' },
  { file: 'brebis.jpg', query: 'ewe sheep' },
  { file: 'agneau.jpg', query: 'lamb baby sheep' },
  // Chevre / Bouc
  { file: 'bouc.jpg', query: 'billy goat male' },
  { file: 'chevre.jpg', query: 'goat female' },
  { file: 'chevreau.jpg', query: 'baby goat kid' },
  // Vache / Taureau
  { file: 'taureau.jpg', query: 'bull cattle' },
  { file: 'vache.jpg', query: 'cow' },
  { file: 'veau.jpg', query: 'calf baby cow' },
  // Cochon / Verrat
  { file: 'verrat.jpg', query: 'boar pig domestic' },
  { file: 'truie.jpg', query: 'sow pig female' },
  { file: 'porcelet.jpg', query: 'piglet baby pig' },
  // Sanglier
  { file: 'sanglier.jpg', query: 'wild boar' },
  { file: 'laie.jpg', query: 'wild boar female sow' },
  { file: 'marcassin.jpg', query: 'wild boar piglet baby' },
  // Coq / Poule
  { file: 'coq.jpg', query: 'rooster' },
  { file: 'poule.jpg', query: 'hen chicken' },
  { file: 'poussin.jpg', query: 'chick baby chicken' },
  // Canard
  { file: 'canard.jpg', query: 'duck male mallard' },
  { file: 'cane.jpg', query: 'duck female' },
  { file: 'caneton.jpg', query: 'duckling baby duck' },
  // Loup
  { file: 'loup.jpg', query: 'wolf' },
  { file: 'louve.jpg', query: 'wolf female' },
  { file: 'louveteau.jpg', query: 'wolf cub puppy' },
  // Renard
  { file: 'renard.jpg', query: 'fox' },
  { file: 'renarde.jpg', query: 'fox female vixen' },
  { file: 'renardeau.jpg', query: 'fox cub baby kit' },
  // Ane
  { file: 'ane.jpg', query: 'donkey' },
  { file: 'anesse.jpg', query: 'donkey female jenny' },
  { file: 'anon.jpg', query: 'donkey foal baby' },
];

function searchPixabay(query) {
  return new Promise((resolve, reject) => {
    const url = `https://pixabay.com/api/?key=${API_KEY}&q=${encodeURIComponent(query)}&image_type=photo&per_page=3&safesearch=true`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });
}

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        downloadFile(res.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      res.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  if (!fs.existsSync(IMAGE_DIR)) {
    fs.mkdirSync(IMAGE_DIR, { recursive: true });
  }

  console.log(`Telechargement de ${animals.length} images...\n`);

  let success = 0;
  let failed = 0;

  for (const animal of animals) {
    const dest = path.join(IMAGE_DIR, animal.file);

    // Skip si deja telecharge
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) {
      console.log(`✓ ${animal.file} (deja present)`);
      success++;
      continue;
    }

    try {
      const result = await searchPixabay(animal.query);

      if (result.hits && result.hits.length > 0) {
        // Utiliser webformatURL (640px) pour un bon compromis taille/qualite
        const imageUrl = result.hits[0].webformatURL;
        await downloadFile(imageUrl, dest);
        const size = fs.statSync(dest).size;
        console.log(`✓ ${animal.file} (${Math.round(size/1024)}KB) - "${animal.query}"`);
        success++;
      } else {
        console.log(`✗ ${animal.file} - aucun resultat pour "${animal.query}"`);
        failed++;
      }

      // Pause 200ms pour respecter les limites API
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      console.log(`✗ ${animal.file} - erreur: ${err.message}`);
      failed++;
    }
  }

  console.log(`\nTermine ! ${success} reussies, ${failed} echouees.`);
}

main();
